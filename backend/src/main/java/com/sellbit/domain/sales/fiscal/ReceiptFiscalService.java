package com.sellbit.domain.sales.fiscal;

import com.sellbit.domain.catalog.product.ProductService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatusRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

@Service
@RequiredArgsConstructor
public class ReceiptFiscalService {

    private final ReceiptRepository receiptRepository;
    private final ReceiptStatusRepository statusRepository;
    private final ReceiptItemRepository itemRepository;
    private final FiscalAgentService fiscalAgentService;
    private final PurchaseService purchaseService;
    private final ProductService productService;
    private final ReceiptService receiptService;

    // Self-injection pentru a trece prin proxy Spring și a respecta @Transactional
    @Setter(onMethod_ = {@Autowired, @Lazy})
    private ReceiptFiscalService self;

    // Serializează secvența snapshot→POST pentru ORICE trimitere către Fisco (bonuri de
    // vânzare, bonuri directe, rapoarte X/Z). Cu un singur POST in-flight și un singur client
    // HTTP al driverului, diff-ul de reconciliere devine neambiguu: orice job apărut în Fisco
    // după snapshotul unui bon nu poate fi decât jobul acelui bon.
    private static final ReentrantLock SEND_LOCK = new ReentrantLock();
    private static final ScheduledExecutorService AUTO_CHECK_EXECUTOR =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "sellbit-fiscal-auto-check");
                t.setDaemon(true);
                return t;
            });
    private static final long AUTO_CHECK_DELAY_SECONDS = 30;

    // Marker pentru „istoricul Fisco era gol la momentul snapshotului" — diferit de null,
    // care înseamnă „nu s-a luat niciun snapshot / nimic trimis pentru bonul ăsta".
    private static final String SNAPSHOT_EMPTY_HISTORY = "NONE";

    // Orchestrator: fără @Transactional intenționat — Fisco nu trebuie să fie în interiorul unei tranzacții DB
    public CustomerVoucherDTOs.VoucherIssuanceResult closeFiscal(Integer receiptId) {
        self.markFiscalPending(receiptId); // TX1 → commit
        return attemptPrintAndFinalize(receiptId);
    }

    // Singura decizie de fiscalizare din tot fluxul: întreabă Fisco ce știe despre bonul ăsta
    // și acționează direct pe baza răspunsului lui — exact fluxul din manualul Fisco. Nicio
    // ramură nu poate retrimite o comandă cât timp există un job neconfirmat: retrimiterea e
    // permisă DOAR cu dovadă negativă (rejected / failed / not_found / reconciliere cu zero
    // joburi noi față de snapshot). Nu există retry automat în fundal.
    CustomerVoucherDTOs.VoucherIssuanceResult attemptPrintAndFinalize(Integer receiptId) {
        Receipt receipt = self.loadReceiptForFiscal(receiptId);

        // Bon fără plată reală cash/card pe GV (ex: acoperit integral din voucher/avans) — nu
        // are nevoie de bon fiscal, nu trebuie să depindă deloc de conexiunea la Fisco.
        if (!fiscalAgentService.needsFiscalPrint(receipt)) {
            return self.completeFiscalClose(receiptId);
        }

        // Avem deja un job_id de la o încercare anterioară (confirmat acceptat de Fisco) —
        // verificare precisă 1:1, per manualul Fisco. Cât timp acest job_id există, NU trimitem
        // nicio comandă nouă — doar întrebăm ce s-a întâmplat cu el.
        if (receipt.getFiscalJobId() != null) {
            return resolveExistingJob(receiptId, receipt.getFiscalJobId());
        }

        SEND_LOCK.lock();
        try {
            // Rest de la o trimitere anterioară al cărei răspuns s-a pierdut (bon FISCAL_FAILED
            // reluat) — reconciliem întâi propriul bon: ori adoptăm jobul pierdut, ori dovedim
            // că Fisco nu l-a primit și abia apoi trimitem din nou.
            if (receipt.getFiscalSnapshotJobId() != null) {
                reconcileUnconfirmedSend(receiptId);
                Receipt after = receiptRepository.findByIdWithStatus(receiptId)
                        .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
                if (after.getFiscalJobId() != null) {
                    return resolveExistingJob(receiptId, after.getFiscalJobId());
                }
                if (!"FISCAL_PENDING".equals(after.getStatus().getCode())) {
                    // zero-diff → bonul a revenit pe OPEN; îl re-marcăm și trimitem curat
                    self.markFiscalPending(receiptId);
                }
            }

            // Alte bonuri cu răspuns pierdut blochează orice trimitere nouă până se lămuresc —
            // altfel jobul nostru ar apărea în diff-ul lor ca job necunoscut.
            try {
                reconcileAllUnconfirmedSends(receiptId);
            } catch (RuntimeException e) {
                self.rollbackToOpen(receiptId);
                throw e;
            }

            // Verificare de conexiune chiar înainte de comandă — fereastra dintre verificare și
            // trimitere e de ordinul milisecundelor. Dacă nu răspunde, sigur nimic nu poate
            // ajunge la Fisco acum — revenim direct pe OPEN, fără ambiguitate.
            if (!fiscalAgentService.checkHealth()) {
                self.rollbackToOpen(receiptId);
                throw new RuntimeException("ERROR.FISCAL.NOT_CONNECTED");
            }

            // Snapshot persistat ÎNAINTE de POST: dacă răspunsul se pierde, reconcilierea
            // compară joburile Fisco cu acest reper și decide programatic, fără casier.
            String latestJob;
            try {
                latestJob = fiscalAgentService.getLatestJobId();
            } catch (RuntimeException e) {
                self.rollbackToOpen(receiptId); // nimic trimis încă — rollback sigur
                throw new RuntimeException("ERROR.FISCAL.NOT_CONNECTED");
            }
            self.recordFiscalSnapshot(receiptId, latestJob == null ? SNAPSHOT_EMPTY_HISTORY : latestJob);

            try {
                FiscalAgentService.PrintedResult printed = fiscalAgentService.printGvBon(
                        receipt, jobId -> self.recordFiscalJobId(receiptId, jobId));
                self.recordFiscalResult(receiptId, printed); // manual 2.2: nr. bon, raport Z, serie
            } catch (RuntimeException e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                if (msg.startsWith("ERROR.FISCAL.PRINT_REJECTED")) {
                    // POST a ajuns la Fisco, dar a fost respins înainte de a crea un job → rollback sigur la OPEN
                    self.rollbackToOpen(receiptId);
                } else if (msg.equals("ERROR.FISCAL.CONNECT_FAILED")) {
                    // TCP refused — tunel căzut, Fisco sigur nu a primit nimic → rollback sigur la OPEN
                    self.rollbackToOpen(receiptId);
                }
                // ERROR.FISCAL.AGENT_UNREACHABLE → răspunsul la POST s-a pierdut. Bonul rămâne
                // FISCAL_PENDING cu snapshotul persistat — reconcilierea de la următoarea
                // atingere (check/retry/altă trimitere) decide programatic, fără casier.
                // POLLING_LOST, TIMEOUT, PRINT_FAILED → job_id-ul a fost deja reținut prin
                // callback → la reluare intră pe verificarea precisă, nu retrimite orbește.
                throw e;
            }
        } finally {
            SEND_LOCK.unlock();
        }

        return self.completeFiscalClose(receiptId); // TX2 → commit
    }

    // Verifică precis un job_id deja cunoscut (reținut la o încercare anterioară) și decide,
    // fără să mai trimită vreodată o comandă nouă cât timp job_id-ul ăsta e neconfirmat.
    private CustomerVoucherDTOs.VoucherIssuanceResult resolveExistingJob(Integer receiptId, String jobId) {
        String jobStatus = fiscalAgentService.findStatusByJobId(jobId);

        if ("printed".equals(jobStatus)) {
            self.recordFiscalResult(receiptId, fiscalAgentService.fetchPrintedResult(jobId));
            return self.completeFiscalClose(receiptId);
        }
        if ("queued".equals(jobStatus) || "processing".equals(jobStatus)) {
            throw new RuntimeException("ERROR.FISCAL.STILL_PROCESSING");
        }
        if ("failed".equals(jobStatus) || "not_found".equals(jobStatus)) {
            // failed: Fisco a confirmat explicit eșecul — sigur nu s-a tipărit. not_found: cu
            // trimiteri serializate și un singur client HTTP, rotația bufferului e exclusă,
            // deci jobul nu mai există în Fisco și nu mai poate fi tipărit. Retry permis.
            self.rollbackToOpen(receiptId); // curăță fiscalJobId + snapshot → reluarea trimite un job nou
            throw new RuntimeException("ERROR.FISCAL.PRINT_FAILED_CONFIRMED");
        }
        // null = Fisco inaccesibil acum — nu putem confirma nimic. NU retrimitem; rămâne
        // FISCAL_PENDING, se reia verificarea când conexiunea revine.
        throw new RuntimeException("ERROR.FISCAL.UNCONFIRMED");
    }

    // Reconciliază toate bonurile rămase cu snapshot dar fără job_id confirmat (răspuns
    // pierdut la POST), cu excepția celui curent — apelată înaintea oricărei trimiteri noi.
    private void reconcileAllUnconfirmedSends(Integer excludeReceiptId) {
        List<Receipt> unconfirmed = receiptRepository
                .findByStatus_CodeAndFiscalJobIdIsNullAndFiscalSnapshotJobIdIsNotNull("FISCAL_PENDING");
        for (Receipt r : unconfirmed) {
            if (r.getId().equals(excludeReceiptId)) continue;
            reconcileUnconfirmedSend(r.getId());
        }
    }

    // Decide programatic soarta unui bon al cărui POST a rămas fără răspuns, pe baza listei
    // de joburi Fisco (GET /api/v1/status, cele mai noi primele):
    //  - exact un job necunoscut mai nou decât snapshotul = jobul nostru pierdut → îl adoptăm;
    //  - zero joburi noi = Fisco n-a primit nimic → bonul revine pe OPEN (sau se șterge, dacă
    //    e bon direct) și poate fi retrimis în siguranță;
    //  - mai multe = nedecidabil (posibil doar cu un al doilea client HTTP) → rămâne pending.
    // Rulează sub SEND_LOCK ca să nu prindă în diff un POST in-flight al altui thread.
    private void reconcileUnconfirmedSend(Integer receiptId) {
        SEND_LOCK.lock();
        try {
            Receipt receipt = receiptRepository.findByIdWithStatus(receiptId).orElse(null);
            if (receipt == null
                    || !"FISCAL_PENDING".equals(receipt.getStatus().getCode())
                    || receipt.getFiscalJobId() != null
                    || receipt.getFiscalSnapshotJobId() == null) {
                return; // lămurit între timp
            }

            List<String> jobs = fiscalAgentService.listRecentJobIds(); // aruncă AGENT_UNREACHABLE

            String snapshot = receipt.getFiscalSnapshotJobId();
            List<String> newerThanSnapshot;
            if (SNAPSHOT_EMPTY_HISTORY.equals(snapshot)) {
                newerThanSnapshot = jobs; // istoricul era gol la snapshot — orice job e nou
            } else {
                int idx = jobs.indexOf(snapshot);
                // snapshot absent din listă = driverul și-a pierdut istoricul (restart) —
                // toate joburile rămase sunt candidate, filtrate mai jos de cele deja atribuite
                newerThanSnapshot = idx >= 0 ? jobs.subList(0, idx) : jobs;
            }

            List<String> candidates = newerThanSnapshot.stream()
                    .filter(id -> !receiptRepository.existsByFiscalJobId(id))
                    .toList();

            if (candidates.isEmpty()) {
                // Niciun job nou după snapshot → POST-ul sigur nu a ajuns la Fisco → curățare sigură
                if (isDirectReceipt(receiptId)) {
                    self.deletePendingReceipt(receiptId);
                } else {
                    self.rollbackToOpen(receiptId);
                }
                return;
            }
            if (candidates.size() == 1) {
                self.recordFiscalJobId(receiptId, candidates.get(0));
                return;
            }
            throw new RuntimeException("ERROR.FISCAL.UNCONFIRMED");
        } finally {
            SEND_LOCK.unlock();
        }
    }

    /** ADVANCE / GIFT_CARD = bon direct: la eșec sigur se șterge, nu revine pe OPEN. */
    private boolean isDirectReceipt(Integer receiptId) {
        Receipt receipt = receiptRepository.findByIdWithItems(receiptId).orElse(null);
        if (receipt == null) return false;
        for (ReceiptItem item : receipt.getItems()) {
            var type = item.getProduct().getProductType();
            if (type != null && ("ADVANCE".equals(type.getCode()) || "GIFT_CARD".equals(type.getCode()))) {
                return true;
            }
        }
        return false;
    }

    // Rapoartele trec prin același lock + gate ca bonurile: un raport trimis între snapshotul
    // unui bon și reconcilierea lui ar apărea în diff ca job necunoscut și ar strica decizia.
    public void printReportX() {
        SEND_LOCK.lock();
        try {
            reconcileAllUnconfirmedSends(null);
            fiscalAgentService.printReportX();
        } finally {
            SEND_LOCK.unlock();
        }
    }

    public void printReportZ() {
        SEND_LOCK.lock();
        try {
            reconcileAllUnconfirmedSends(null);
            fiscalAgentService.printReportZ();
        } finally {
            SEND_LOCK.unlock();
        }
    }

    @Transactional
    public void recordFiscalJobId(Integer receiptId, String jobId) {
        receiptRepository.findById(receiptId).ifPresent(r -> {
            r.setFiscalJobId(jobId);
            // Jobul e confirmat — snapshotul nu mai are rol; de aici verificarea e 1:1 pe job_id
            r.setFiscalSnapshotJobId(null);
            receiptRepository.save(r);
        });
    }

    // Persistat (commit) ÎNAINTE de POST /api/v1/print — reperul reconcilierii dacă răspunsul se pierde
    @Transactional
    public void recordFiscalSnapshot(Integer receiptId, String snapshotJobId) {
        receiptRepository.findById(receiptId).ifPresent(r -> {
            r.setFiscalSnapshotJobId(snapshotJobId);
            receiptRepository.save(r);
            schedulePendingFiscalCheck(receiptId);
        });
    }

    // Datele fiscale din răspunsul "printed" (manual 2.2: numărul bonului, raportul Z, seria
    // imprimantei). Best-effort: null nu blochează închiderea — printarea e deja confirmată.
    @Transactional
    public void recordFiscalResult(Integer receiptId, FiscalAgentService.PrintedResult result) {
        if (result == null) return;
        receiptRepository.findById(receiptId).ifPresent(r -> {
            r.setFiscalSlipNumber(result.slipNumber());
            r.setFiscalZReportNumber(result.zReportNumber());
            r.setFiscalBonNumber(result.bonNumber());
            r.setFiscalDeviceSerial(result.deviceSerial());
            receiptRepository.save(r);
        });
    }

    // Casierul confirmă vizual, la casă, că bonul chiar s-a tipărit fizic — folosit când Fisco
    // n-a putut confirma în timp util (~30s). Închide direct, fără să mai întrebe Fisco din nou.
    public CustomerVoucherDTOs.VoucherIssuanceResult confirmPrintedManually(Integer receiptId) {
        return self.completeFiscalClose(receiptId);
    }

    // „Verifică și reia": rezolvare sigură, fără încredere oarbă în vreo confirmare umană —
    // retrimite DOAR cu dovadă negativă (failed / not_found / reconciliere cu zero joburi noi
    // față de snapshot). Pe queued/processing sau cu Fisco inaccesibil refuză explicit.
    public CustomerVoucherDTOs.VoucherIssuanceResult retryNotPrinted(Integer receiptId) {
        Receipt receipt = receiptRepository.findByIdWithStatus(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        if (!"FISCAL_PENDING".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_FISCAL_PENDING");
        }

        // Răspuns pierdut la POST (fără job_id) → reconciliere programatică întâi
        if (receipt.getFiscalJobId() == null && receipt.getFiscalSnapshotJobId() != null) {
            reconcileUnconfirmedSend(receiptId); // aruncă dacă Fisco inaccesibil / nedecidabil
            Receipt after = receiptRepository.findByIdWithStatus(receiptId).orElse(null);
            if (after == null) {
                // bon direct șters la reconciliere — comanda sigur nu a ajuns la casă
                throw new RuntimeException("ERROR.FISCAL.DIRECT_NOT_PRINTED");
            }
            if ("OPEN".equals(after.getStatus().getCode())) {
                return closeFiscal(receiptId); // dovadă: Fisco n-a primit nimic → retrimitere sigură
            }
            receipt = after; // job adoptat — cade pe verificarea de status de mai jos
        }

        if (receipt.getFiscalJobId() != null) {
            String status = fiscalAgentService.findStatusByJobId(receipt.getFiscalJobId());
            if ("printed".equals(status)) {
                self.recordFiscalResult(receiptId, fiscalAgentService.fetchPrintedResult(receipt.getFiscalJobId()));
                return self.completeFiscalClose(receiptId);
            }
            if ("queued".equals(status) || "processing".equals(status)) {
                throw new RuntimeException("ERROR.FISCAL.STILL_PROCESSING");
            }
            if (status == null) {
                throw new RuntimeException("ERROR.FISCAL.UNCONFIRMED");
            }
            // failed / not_found → dovadă negativă (vezi resolveExistingJob pentru raționament)
            if (isDirectReceipt(receiptId)) {
                self.deletePendingReceipt(receiptId);
                throw new RuntimeException("ERROR.FISCAL.DIRECT_NOT_PRINTED");
            }
            self.rollbackToOpen(receiptId);
            return closeFiscal(receiptId);
        }

        // FISCAL_PENDING fără snapshot și fără job: crash înainte de a trimite ceva → sigur
        self.rollbackToOpen(receiptId);
        return closeFiscal(receiptId);
    }

    // Verificare pasivă, fără efecte secundare de retrimitere: folosită la redeschiderea unui
    // bon FISCAL_PENDING (ex: casierul a plecat de pe pagină și s-a întors) — dacă între timp
    // Fisco a confirmat "printed", închide automat; altfel nu face nimic, iar UI-ul întreabă
    // din nou casierul dacă s-a tipărit.
    public boolean checkAndCloseIfPrinted(Integer receiptId) {
        Receipt receipt = receiptRepository.findByIdWithStatus(receiptId).orElse(null);
        if (receipt == null || !"FISCAL_PENDING".equals(receipt.getStatus().getCode())) return false;

        // Răspuns pierdut la POST (fără job_id) → reconciliere programatică pe snapshot:
        // adoptă jobul pierdut sau curăță bonul (OPEN / ștergere) dacă Fisco n-a primit nimic.
        if (receipt.getFiscalJobId() == null) {
            if (receipt.getFiscalSnapshotJobId() == null) return false; // nimic trimis vreodată
            try {
                reconcileUnconfirmedSend(receiptId);
            } catch (RuntimeException e) {
                return false; // Fisco inaccesibil / nedecidabil acum — rămâne pending
            }
            receipt = receiptRepository.findByIdWithStatus(receiptId).orElse(null);
            // zero-diff: bon revenit pe OPEN sau șters — FE re-fetch-uiește și vede starea reală
            if (receipt == null || receipt.getFiscalJobId() == null) return false;
        }

        String status = fiscalAgentService.findStatusByJobId(receipt.getFiscalJobId());

        if ("printed".equals(status)) {
            self.recordFiscalResult(receiptId, fiscalAgentService.fetchPrintedResult(receipt.getFiscalJobId()));
            self.completeFiscalClose(receiptId);
            return true;
        }
        if ("failed".equals(status) || "not_found".equals(status)) {
            // Dovadă negativă — curățăm automat, casierul reia închiderea din fluxul normal
            if (isDirectReceipt(receiptId)) {
                self.deletePendingReceipt(receiptId);
            } else {
                self.rollbackToOpen(receiptId);
            }
            return false;
        }
        return false; // queued / processing / Fisco inaccesibil → rămâne pending
    }

    private void schedulePendingFiscalCheck(Integer receiptId) {
        AUTO_CHECK_EXECUTOR.schedule(() -> {
            try {
                checkAndCloseIfPrinted(receiptId);
            } catch (RuntimeException ignored) {
                // Best effort only: no automatic retry; unresolved receipts remain FISCAL_PENDING.
            }
        }, AUTO_CHECK_DELAY_SECONDS, TimeUnit.SECONDS);
    }

    // Orchestrator avans petrecere: TX1 creare bon FISCAL_PENDING → print → TX2 finalizare.
    // Bon fiscal doar dacă gestiunea aleasă e GV (filtrarea din printGvBon); altfel se închide direct.
    public void registerAdvanceFiscal(Integer warehouseId, BigDecimal amount,
            String paymentMethodCode, Integer userId, String note) {
        Integer receiptId = receiptService.createDirectReceiptPending(
                "ADVANCE", warehouseId, amount, paymentMethodCode, userId, note);
        printDirectOrCleanup(receiptId);
        self.completeFiscalClose(receiptId);
    }

    // Orchestrator card cadou: identic cu avansul, dar TX2 emite și voucherul cadou
    public CustomerVoucherDTOs.IssuedVoucherInfo registerGiftCardFiscal(Integer warehouseId,
            BigDecimal amount, String paymentMethodCode, Integer userId, String note) {
        Integer receiptId = receiptService.createDirectReceiptPending(
                "GIFT_CARD", warehouseId, amount, paymentMethodCode, userId, note);
        printDirectOrCleanup(receiptId);
        CustomerVoucherDTOs.VoucherIssuanceResult result = self.completeFiscalClose(receiptId);
        return result.vouchers().isEmpty() ? null : result.vouchers().get(0);
    }

    // Print pentru bon direct — aceleași cazuri ca în closeFiscal, dar la eșec sigur bonul
    // abia creat se ȘTERGE (nu are încă mișcare de casă / voucher), nu revine la OPEN
    private void printDirectOrCleanup(Integer receiptId) {
        Receipt receipt = self.loadReceiptForFiscal(receiptId);

        if (!fiscalAgentService.needsFiscalPrint(receipt)) {
            return; // fără plată reală cash/card — nu are nevoie de bon fiscal
        }

        SEND_LOCK.lock();
        try {
            // Alte bonuri cu răspuns pierdut se lămuresc înaintea oricărei trimiteri noi
            try {
                reconcileAllUnconfirmedSends(receiptId);
            } catch (RuntimeException e) {
                self.deletePendingReceipt(receiptId);
                throw e;
            }

            // Verificare de conexiune chiar înainte de comandă — dacă nu răspunde, sigur nimic nu
            // poate ajunge la Fisco acum; bonul abia creat se șterge direct, fără ambiguitate.
            if (!fiscalAgentService.checkHealth()) {
                self.deletePendingReceipt(receiptId);
                throw new RuntimeException("ERROR.FISCAL.NOT_CONNECTED");
            }

            // Snapshot persistat ÎNAINTE de POST — reperul reconcilierii dacă răspunsul se pierde
            String latestJob;
            try {
                latestJob = fiscalAgentService.getLatestJobId();
            } catch (RuntimeException e) {
                self.deletePendingReceipt(receiptId); // nimic trimis încă — ștergere sigură
                throw new RuntimeException("ERROR.FISCAL.NOT_CONNECTED");
            }
            self.recordFiscalSnapshot(receiptId, latestJob == null ? SNAPSHOT_EMPTY_HISTORY : latestJob);

            try {
                FiscalAgentService.PrintedResult printed = fiscalAgentService.printGvBon(
                        receipt, jobId -> self.recordFiscalJobId(receiptId, jobId));
                self.recordFiscalResult(receiptId, printed); // manual 2.2: nr. bon, raport Z, serie
            } catch (RuntimeException e) {
                String msg = e.getMessage() != null ? e.getMessage() : "";
                if (msg.startsWith("ERROR.FISCAL.PRINT_REJECTED") || msg.equals("ERROR.FISCAL.CONNECT_FAILED")) {
                    // Fisco sigur nu a creat un job → ștergere sigură
                    self.deletePendingReceipt(receiptId);
                }
                // ERROR.FISCAL.AGENT_UNREACHABLE → răspuns pierdut; bonul rămâne FISCAL_PENDING
                // cu snapshotul persistat — reconcilierea decide programatic la următoarea
                // atingere (check/retry/altă trimitere), fără casier.
                // POLLING_LOST, TIMEOUT, PRINT_FAILED → job_id reținut → verificare precisă la reluare
                throw e;
            }
        } finally {
            SEND_LOCK.unlock();
        }
    }

    @Transactional
    public void deletePendingReceipt(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null || !"FISCAL_PENDING".equals(receipt.getStatus().getCode())) {
            return;
        }
        receiptRepository.delete(receipt); // items + payments cad prin cascade
    }

    // Încarcă receipt cu items + payments în aceeași tranzacție (L1 cache activ)
    @Transactional(readOnly = true)
    public Receipt loadReceiptForFiscal(Integer receiptId) {
        receiptRepository.findByIdWithItems(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        return receiptRepository.findByIdWithPayments(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
    }

    @Transactional
    public void rollbackToOpen(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        ReceiptStatus openStatus = statusRepository.findByCode("OPEN")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));
        receipt.setStatus(openStatus);
        // Curățăm job_id-ul și snapshotul vechi — o reluare de pe OPEN e o încercare nouă.
        // Fără asta, gate-ul din attemptPrintAndFinalize ar verifica greșit jobul abandonat.
        receipt.setFiscalJobId(null);
        receipt.setFiscalSnapshotJobId(null);
        receiptRepository.save(receipt);
    }

    // TX1: validări + setare FISCAL_PENDING
    @Transactional
    public void markFiscalPending(Integer receiptId) {
        // Lock pe rândul bonului: serializează cererile concurente (dublu-click, retry) pe
        // același receiptId — a doua cerere așteaptă commit-ul primei și vede statusul deja
        // actualizat, în loc să treacă amândouă de validare și să printeze de două ori.
        receiptRepository.lockById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        receiptRepository.findByIdWithItems(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        Receipt receipt = receiptRepository.findByIdWithPayments(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        String statusCode = receipt.getStatus().getCode();
        if ("FISCAL_PENDING".equals(statusCode)) {
            throw new RuntimeException("ERROR.RECEIPT.ALREADY_FISCAL_PENDING");
        }
        if (!"OPEN".equals(statusCode) && !"FISCAL_FAILED".equals(statusCode)) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        validateCateringPrices(receipt);

        BigDecimal paidAmount = receipt.getPayments().stream()
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (paidAmount.compareTo(receipt.getTotalAmount()) != 0) {
            throw new RuntimeException("ERROR.RECEIPT.INCOMPLETE_PAYMENT");
        }

        validateWarehousePaymentBalance(receipt);

        for (ReceiptItem item : receipt.getItems()) {
            if (item.getQuantity().compareTo(BigDecimal.ZERO) != 0) {
                Warehouse itemWarehouse = productService.resolveWarehouse(item.getProduct(), item.getWarehouse());
                purchaseService.validateStockAvailability(itemWarehouse.getId(), item.getProduct(), item.getQuantity());
            }
        }

        ReceiptStatus fiscalPendingStatus = statusRepository.findByCode("FISCAL_PENDING")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

        receipt.setStatus(fiscalPendingStatus);
        receiptRepository.save(receipt);
    }

    // TX2: FIFO + setare CLOSED + vouchers (apelat și de reconciliere)
    @Transactional
    public CustomerVoucherDTOs.VoucherIssuanceResult completeFiscalClose(Integer receiptId) {
        // Lock pe rândul bonului: serializează cererea curentă (closeFiscal) față de job-ul de
        // reconciliere care poate încerca să finalizeze același bon în paralel — a doua sare
        // curat cu NOT_FISCAL_PENDING în loc să facă dublă finalizare/FIFO.
        receiptRepository.lockById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        receiptRepository.findByIdWithItems(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        Receipt receipt = receiptRepository.findByIdWithPayments(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"FISCAL_PENDING".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_FISCAL_PENDING");
        }

        for (ReceiptItem item : receipt.getItems()) {
            if (item.getQuantity().compareTo(BigDecimal.ZERO) != 0) {
                Warehouse itemWarehouse = productService.resolveWarehouse(
                        item.getProduct(), item.getWarehouse());

                BigDecimal purchasePrice = purchaseService.consumeForReceiptItemAndRecord(
                        itemWarehouse.getId(), receipt, item);

                item.setPurchaseUnitPrice(purchasePrice);
                itemRepository.save(item);
            }
        }

        ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

        receipt.setStatus(closedStatus);
        receipt.setClosedAt(LocalDateTime.now());
        receiptRepository.save(receipt);

        // Kind-aware: vouchere campanii pentru vânzări, mișcare de casă + voucher cadou pentru bonuri directe
        return receiptService.finalizeClosedReceipt(receipt);
    }

    @Transactional
    public void markFiscalFailed(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"FISCAL_PENDING".equals(receipt.getStatus().getCode())) return;

        ReceiptStatus failedStatus = statusRepository.findByCode("FISCAL_FAILED")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

        receipt.setStatus(failedStatus);
        receiptRepository.save(receipt);
    }

    private void validateCateringPrices(Receipt receipt) {
        for (ReceiptItem item : receipt.getItems()) {
            var product = item.getProduct();
            if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {
                if (product.getPurchasePrice() == null) {
                    throw new RuntimeException("ERROR.CATERING.PURCHASE_PRICE_NULL");
                }
            }
        }
    }

    private void validateWarehousePaymentBalance(Receipt receipt) {
        boolean hasUnassignedPayment = receipt.getPayments().stream()
                .anyMatch(p -> p.getWarehouse() == null);
        if (hasUnassignedPayment) return;

        Map<Integer, BigDecimal> itemsByWh = new LinkedHashMap<>();
        for (ReceiptItem item : receipt.getItems()) {
            if (item.getWarehouse() == null) continue;
            BigDecimal line = item.getLineTotal() != null ? item.getLineTotal() : BigDecimal.ZERO;
            itemsByWh.merge(item.getWarehouse().getId(), line, BigDecimal::add);
        }

        Map<Integer, BigDecimal> paymentsByWh = new LinkedHashMap<>();
        for (ReceiptPayment payment : receipt.getPayments()) {
            paymentsByWh.merge(payment.getWarehouse().getId(), payment.getAmount(), BigDecimal::add);
        }

        java.util.Set<Integer> allWhs = new java.util.HashSet<>();
        allWhs.addAll(itemsByWh.keySet());
        allWhs.addAll(paymentsByWh.keySet());

        BigDecimal tolerance = new BigDecimal("0.01");
        for (Integer whId : allWhs) {
            BigDecimal items = itemsByWh.getOrDefault(whId, BigDecimal.ZERO);
            BigDecimal payments = paymentsByWh.getOrDefault(whId, BigDecimal.ZERO);
            if (items.subtract(payments).abs().compareTo(tolerance) > 0) {
                throw new RuntimeException("ERROR.RECEIPT.WAREHOUSE_PAYMENT_MISMATCH");
            }
        }
    }
}

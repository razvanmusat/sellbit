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
import java.util.Map;

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

    // Orchestrator: fără @Transactional intenționat — Fisco nu trebuie să fie în interiorul unei tranzacții DB
    public CustomerVoucherDTOs.VoucherIssuanceResult closeFiscal(Integer receiptId) {
        self.markFiscalPending(receiptId); // TX1 → commit
        return attemptPrintAndFinalize(receiptId);
    }

    // Singura decizie de fiscalizare din tot fluxul: întreabă Fisco ce știe despre bonul ăsta
    // și acționează direct pe baza răspunsului lui — exact fluxul din manualul Fisco. Dacă
    // Fisco nu dă un răspuns clar în ~30s (fereastra din FiscalAgentService), bonul rămâne
    // FISCAL_PENDING și decizia trece la casier — vezi confirmPrintedManually/retryNotPrinted.
    // Nu există retry automat în fundal.
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

        // Verificare de conexiune chiar înainte de comandă (nu separat, ca statusul din UI) —
        // fereastra dintre verificare și trimitere e de ordinul milisecundelor, nu secundelor.
        // Dacă nu răspunde, sigur nimic nu poate ajunge la Fisco acum — revenim direct pe OPEN,
        // fără ambiguitate, fără să mai așteptăm degeaba și fără să mai întrebăm casierul.
        if (!fiscalAgentService.checkHealth()) {
            self.rollbackToOpen(receiptId);
            throw new RuntimeException("ERROR.FISCAL.NOT_CONNECTED");
        }

        try {
            fiscalAgentService.printGvBon(receipt, jobId -> self.recordFiscalJobId(receiptId, jobId));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.startsWith("ERROR.FISCAL.PRINT_REJECTED")) {
                // POST a ajuns la Fisco, dar a fost respins înainte de a crea un job → rollback sigur la OPEN
                self.rollbackToOpen(receiptId);
            } else if (msg.equals("ERROR.FISCAL.CONNECT_FAILED")) {
                // TCP refused — tunel căzut, Fisco sigur nu a primit nimic → rollback sigur la OPEN
                self.rollbackToOpen(receiptId);
            } else if (msg.equals("ERROR.FISCAL.AGENT_UNREACHABLE")) {
                // Conexiune căzută înainte de a primi job_id — incert dacă Fisco a primit request-ul.
                String statusAfterUnreachable = fiscalAgentService.findStatusByExternalId("sb-" + receiptId);
                if ("not_found".equals(statusAfterUnreachable)) {
                    // Fisco e reachabil și confirmă că nu are jobul → rollback sigur la OPEN
                    self.rollbackToOpen(receiptId);
                }
                // null = Fisco inaccesibil → rămâne FISCAL_PENDING, casierul confirmă manual
                // orice alt status = Fisco are jobul dar nu e încă printed → rămâne FISCAL_PENDING
            }
            // POLLING_LOST, TIMEOUT, PRINT_FAILED → job_id-ul a fost deja reținut prin callback
            // (dacă a apucat să fie primit) → la reluare intră pe ramura de verificare precisă
            // de mai sus, nu mai retrimite orbește. Rămâne FISCAL_PENDING, casierul confirmă.
            throw e;
        }

        return self.completeFiscalClose(receiptId); // TX2 → commit
    }

    // Verifică precis un job_id deja cunoscut (reținut la o încercare anterioară) și decide,
    // fără să mai trimită vreodată o comandă nouă cât timp job_id-ul ăsta e neconfirmat.
    private CustomerVoucherDTOs.VoucherIssuanceResult resolveExistingJob(Integer receiptId, String jobId) {
        String jobStatus = fiscalAgentService.findStatusByJobId(jobId);

        if ("printed".equals(jobStatus)) {
            return self.completeFiscalClose(receiptId);
        }
        if ("queued".equals(jobStatus) || "processing".equals(jobStatus)) {
            throw new RuntimeException("ERROR.FISCAL.STILL_PROCESSING");
        }
        if ("failed".equals(jobStatus)) {
            // Fisco a confirmat explicit eșecul acestui job — sigur nu s-a tipărit, retry permis.
            self.rollbackToOpen(receiptId); // curăță și fiscalJobId, ca reluarea să trimită un job nou
            throw new RuntimeException("ERROR.FISCAL.PRINT_FAILED_CONFIRMED");
        }
        // not_found (buffer Fisco a rotit) sau null (Fisco inaccesibil acum) — știm sigur că
        // ceva a plecat (avem job_id-ul), dar nu putem confirma ce s-a întâmplat. NU retrimitem
        // — rămâne FISCAL_PENDING, casierul confirmă vizual, la casă (DA/NU).
        throw new RuntimeException("ERROR.FISCAL.UNCONFIRMED");
    }

    @Transactional
    public void recordFiscalJobId(Integer receiptId, String jobId) {
        receiptRepository.findById(receiptId).ifPresent(r -> {
            r.setFiscalJobId(jobId);
            receiptRepository.save(r);
        });
    }

    // Casierul confirmă vizual, la casă, că bonul chiar s-a tipărit fizic — folosit când Fisco
    // n-a putut confirma în timp util (~30s). Închide direct, fără să mai întrebe Fisco din nou.
    public CustomerVoucherDTOs.VoucherIssuanceResult confirmPrintedManually(Integer receiptId) {
        return self.completeFiscalClose(receiptId);
    }

    // Casierul confirmă vizual că bonul NU s-a tipărit — revine pe OPEN și retrimite imediat
    // comanda de închidere (același flux ca la prima încercare, cu verificarea Fisco înainte).
    public CustomerVoucherDTOs.VoucherIssuanceResult retryNotPrinted(Integer receiptId) {
        self.rollbackToOpen(receiptId);
        return closeFiscal(receiptId);
    }

    // Verificare pasivă, fără efecte secundare de retrimitere: folosită la redeschiderea unui
    // bon FISCAL_PENDING (ex: casierul a plecat de pe pagină și s-a întors) — dacă între timp
    // Fisco a confirmat "printed", închide automat; altfel nu face nimic, iar UI-ul întreabă
    // din nou casierul dacă s-a tipărit.
    public boolean checkAndCloseIfPrinted(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null) return false;

        String status = receipt.getFiscalJobId() != null
                ? fiscalAgentService.findStatusByJobId(receipt.getFiscalJobId())
                : fiscalAgentService.findStatusByExternalId("sb-" + receiptId);

        if ("printed".equals(status)) {
            self.completeFiscalClose(receiptId);
            return true;
        }
        return false;
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

        String existingStatus = fiscalAgentService.findStatusByExternalId("sb-" + receiptId);
        if ("printed".equals(existingStatus)) {
            return; // deja tipărit — nu retrimitem
        }
        // Job anterior încă activ la Fisco — nu trimitem altul peste el, cât timp e neterminat.
        if ("queued".equals(existingStatus) || "processing".equals(existingStatus)) {
            throw new RuntimeException("ERROR.FISCAL.STILL_PROCESSING");
        }

        // Verificare de conexiune chiar înainte de comandă — dacă nu răspunde, sigur nimic nu
        // poate ajunge la Fisco acum; bonul abia creat se șterge direct, sigur, fără ambiguitate.
        if (!fiscalAgentService.checkHealth()) {
            self.deletePendingReceipt(receiptId);
            throw new RuntimeException("ERROR.FISCAL.NOT_CONNECTED");
        }

        try {
            fiscalAgentService.printGvBon(receipt, jobId -> self.recordFiscalJobId(receiptId, jobId));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.startsWith("ERROR.FISCAL.PRINT_REJECTED") || msg.equals("ERROR.FISCAL.CONNECT_FAILED")) {
                // Fisco sigur nu a creat un job → ștergere sigură
                self.deletePendingReceipt(receiptId);
            } else if (msg.equals("ERROR.FISCAL.AGENT_UNREACHABLE")) {
                String statusAfterUnreachable = fiscalAgentService.findStatusByExternalId("sb-" + receiptId);
                if ("not_found".equals(statusAfterUnreachable)) {
                    // Fisco e reachabil și confirmă că nu are jobul → ștergere sigură
                    self.deletePendingReceipt(receiptId);
                }
                // null / alt status → rămâne FISCAL_PENDING → decizie manuală (vezi confirmPrintedManually/retryNotPrinted)
            }
            // POLLING_LOST, TIMEOUT, PRINT_FAILED → rămâne FISCAL_PENDING, decizie manuală
            throw e;
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
        // Curățăm job_id-ul vechi — o reluare de pe OPEN e o încercare nouă, are nevoie de un
        // job_id nou. Fără asta, gate-ul din attemptPrintAndFinalize ar verifica greșit jobul abandonat.
        receipt.setFiscalJobId(null);
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

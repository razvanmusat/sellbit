package com.sellbit.domain.sales.fiscal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucher;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FiscalAgentService {

    private static final String FISCO_BASE = "http://host.docker.internal:4040";
    private static final String FISCAL_WAREHOUSE = "GV";
    private static final int POLL_TIMEOUT_SECONDS = 30;
    private static final int POLL_INTERVAL_MS = 1000;

    private final CustomerVoucherRepository voucherRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    // GET /api/v1/health — printer.ready indică starea reală a imprimantei (ok=true înseamnă doar că API-ul răspunde)
    public boolean checkHealth() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/health"))
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return false;
            Map<?, ?> body = objectMapper.readValue(response.body(), Map.class);
            Map<?, ?> printer = (Map<?, ?>) body.get("printer");
            return printer != null && Boolean.TRUE.equals(printer.get("ready"));
        } catch (Exception e) {
            return false;
        }
    }

    // Determină dacă bonul are nevoie efectiv de fiscalizare — produse pe gestiunea GV, cu
    // plată reală cash/card (nu doar voucher/avans/transfer). Trebuie verificată ÎNAINTE de
    // orice verificare de conexiune la Fisco — un bon acoperit integral din voucher/avans
    // (total de plată zero) nu trebuie să depindă deloc de starea casei de marcat.
    public boolean needsFiscalPrint(Receipt receipt) {
        boolean hasGvItems = receipt.getItems().stream()
                .anyMatch(item -> item.getWarehouse() != null
                        && FISCAL_WAREHOUSE.equals(item.getWarehouse().getCode()));
        if (!hasGvItems) return false;

        BigDecimal cashCardTotal = receipt.getPayments().stream()
                .filter(p -> p.getWarehouse() != null && FISCAL_WAREHOUSE.equals(p.getWarehouse().getCode()))
                .filter(p -> {
                    String code = p.getPaymentMethod().getCode();
                    return "CASH".equals(code) || "CARD".equals(code);
                })
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return cashCardTotal.compareTo(BigDecimal.ZERO) > 0;
    }

    // POST /api/v1/print + polling status până la printed/failed/timeout
    // Returnează job_id-ul Fisco. onJobAccepted e chemat IMEDIAT ce Fisco confirmă acceptarea
    // comenzii (înainte de polling) — apelantul trebuie să-l reția pe bon pe loc, ca să nu se
    // piardă dacă pollingul de mai jos eșuează (conexiune pierdută, timeout etc.).
    public String printGvBon(Receipt receipt, java.util.function.Consumer<String> onJobAccepted) {
        List<ReceiptItem> gvItems = receipt.getItems().stream()
                .filter(item -> item.getWarehouse() != null
                        && FISCAL_WAREHOUSE.equals(item.getWarehouse().getCode()))
                .collect(Collectors.toList());

        if (gvItems.isEmpty()) return null;

        List<ReceiptPayment> gvPayments = receipt.getPayments().stream()
                .filter(p -> p.getWarehouse() != null
                        && FISCAL_WAREHOUSE.equals(p.getWarehouse().getCode()))
                .collect(Collectors.toList());

        // Plăți cash/card GV → T^ pe bon fiscal
        List<ReceiptPayment> cashCardPayments = gvPayments.stream()
                .filter(p -> {
                    String code = p.getPaymentMethod().getCode();
                    return "CASH".equals(code) || "CARD".equals(code);
                })
                .collect(Collectors.toList());

        BigDecimal cashCardTotal = cashCardPayments.stream()
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Fără plată reală pe GV → nu emitem bon fiscal
        if (cashCardTotal.compareTo(BigDecimal.ZERO) <= 0) return null;

        // Transfer bancar GV → mereu discount pe subtotal (nu se fiscalizează — se facturează prin contabilitate)
        BigDecimal bankTransferAmount = sumByMethod(gvPayments, "BANK_TRANSFER");
        BigDecimal advanceAmount = sumByMethod(gvPayments, "ADVANCE");
        BigDecimal voucherAmount = sumByMethod(gvPayments, "VOUCHER");

        // Avans → discount pe linia produsului de tip MENU (dacă există pe bon; altfel pe subtotal)
        ReceiptItem advanceTargetItem = advanceAmount.compareTo(BigDecimal.ZERO) > 0
                ? gvItems.stream()
                        .filter(i -> i.getProduct().getProductType() != null
                                && "MENU".equals(i.getProduct().getProductType().getCode()))
                        .findFirst().orElse(null)
                : null;

        // Voucher REGULAR/LOYALTY → discount pe linia produsului țintă al campaniei (altfel pe subtotal).
        // GIFT_CARD → mereu pe subtotal, nu se știe dinainte ce produse vor fi pe bon.
        ReceiptItem voucherTargetItem = null;
        if (voucherAmount.compareTo(BigDecimal.ZERO) > 0) {
            Optional<CustomerVoucher> usedVoucher = voucherRepository.findByUsedReceiptId(receipt.getId());
            if (usedVoucher.isPresent()) {
                String campaignTypeCode = usedVoucher.get().getCampaign().getCampaignType().getCode();
                Integer targetProductId = usedVoucher.get().getCampaign().getApplicableProductId();
                if (("REGULAR".equals(campaignTypeCode) || "LOYALTY".equals(campaignTypeCode))
                        && targetProductId != null) {
                    voucherTargetItem = gvItems.stream()
                            .filter(i -> targetProductId.equals(i.getProduct().getId()))
                            .findFirst().orElse(null);
                }
            }
        }

        // Ce n-a găsit linie țintă (avans fără produs MENU, sau voucher fără produsul din campanie
        // pe bon) cade pe discount de subtotal, la fel ca înainte — nu blocăm niciodată bonul.
        BigDecimal subtotalDiscount = bankTransferAmount
                .add(advanceTargetItem == null ? advanceAmount : BigDecimal.ZERO)
                .add(voucherTargetItem == null ? voucherAmount : BigDecimal.ZERO);

        List<String> commands = new ArrayList<>();

        for (ReceiptItem item : gvItems) {
            commands.add(buildProductCommand(item));
            if (item == advanceTargetItem) {
                commands.add(buildDiscountCommand(advanceAmount));
            }
            if (item == voucherTargetItem) {
                commands.add(buildDiscountCommand(voucherAmount));
            }
        }

        if (subtotalDiscount.compareTo(BigDecimal.ZERO) > 0) {
            commands.add("T,1,______,_,__;4;;;;;");
            commands.add(buildDiscountCommand(subtotalDiscount));
        }

        for (ReceiptPayment payment : cashCardPayments) {
            int type = "CARD".equals(payment.getPaymentMethod().getCode()) ? 1 : 0;
            commands.add(String.format(Locale.US, "T,1,______,_,__;%d;%.2f;;;;", type, payment.getAmount()));
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("syntax", "fprint");
        body.put("version", "1.0");
        body.put("external_id", "sb-" + receipt.getId());
        body.put("commands", commands);

        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest printRequest = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/print"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> printResponse;
            try {
                printResponse = httpClient.send(printRequest, HttpResponse.BodyHandlers.ofString());
            } catch (Exception e) {
                boolean connRefused = (e instanceof java.net.ConnectException)
                        || (e.getCause() instanceof java.net.ConnectException);
                if (connRefused) {
                    // TCP refused — tunel căzut, Fisco sigur nu a primit nimic → rollback sigur
                    throw new RuntimeException("ERROR.FISCAL.CONNECT_FAILED");
                }
                // Timeout/altceva — incert dacă Fisco a primit request-ul
                throw new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE");
            }

            Map<?, ?> printResult = objectMapper.readValue(printResponse.body(), Map.class);

            if (!Boolean.TRUE.equals(printResult.get("ok"))) {
                Map<?, ?> err = (Map<?, ?>) printResult.get("error");
                String msg = err != null ? (String) err.get("message") : "rejected";
                throw new RuntimeException("ERROR.FISCAL.PRINT_REJECTED|" + msg);
            }

            String jobId = (String) printResult.get("job_id");
            onJobAccepted.accept(jobId);
            try {
                return pollUntilDone(jobId);
            } catch (RuntimeException e) {
                throw e; // TIMEOUT, INTERRUPTED, PRINT_FAILED
            } catch (Exception e) {
                // Conexiune pierdută DUPĂ ce jobul a fost trimis — job există în Fisco
                throw new RuntimeException("ERROR.FISCAL.POLLING_LOST");
            }

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE");
        }
    }

    // POST /api/v1/print cu X^ sau Z^ (sintaxă simplificată, request separat față de bon)
    public void printReportX() {
        sendReportCommand("X^");
    }

    public void printReportZ() {
        sendReportCommand("Z^");
    }

    private void sendReportCommand(String command) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("syntax", "simplu");
        body.put("version", "1.0");
        body.put("external_id", "rep-" + Instant.now().toEpochMilli());
        body.put("commands", List.of(command));

        try {
            String json = objectMapper.writeValueAsString(body);
            HttpRequest printRequest = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/print"))
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> printResponse = httpClient.send(printRequest, HttpResponse.BodyHandlers.ofString());
            Map<?, ?> printResult = objectMapper.readValue(printResponse.body(), Map.class);

            if (!Boolean.TRUE.equals(printResult.get("ok"))) {
                Map<?, ?> err = (Map<?, ?>) printResult.get("error");
                String msg = err != null ? (String) err.get("message") : "rejected";
                throw new RuntimeException("ERROR.FISCAL.PRINT_REJECTED|" + msg);
            }

            pollUntilDone((String) printResult.get("job_id"));

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE");
        }
    }

    // GET /api/v1/status — caută un job după external_id în ultimele 100 joburi.
    // Returnează: statusul jobului ("printed", "failed") dacă găsit,
    //             "not_found" dacă Fisco e reachabil dar jobul nu există în ultimele 100,
    //             null dacă Fisco e inaccesibil (retry la ciclul următor).
    public String findStatusByExternalId(String externalId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/status"))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<?, ?> body = objectMapper.readValue(response.body(), Map.class);
            List<?> jobs = (List<?>) body.get("jobs");
            if (jobs == null) return "not_found";
            for (Object jobObj : jobs) {
                Map<?, ?> job = (Map<?, ?>) jobObj;
                if (externalId.equals(job.get("external_id"))) {
                    return (String) job.get("status");
                }
            }
            return "not_found"; // Fisco reachabil, jobul nu există în istoric
        } catch (Exception e) {
            return null; // Fisco inaccesibil — retry la ciclul următor
        }
    }

    // GET /api/v1/status?job_id=... — verificare precisă 1:1, per manualul Fisco. Returnează
    // "printed"/"failed"/"queued"/"processing" dacă găsit, "not_found" dacă Fisco e reachabil
    // dar nu mai are jobul (job_id era totuși confirmat acceptat — nu poate însemna "nu s-a
    // trimis niciodată"), null dacă Fisco e inaccesibil acum.
    public String findStatusByJobId(String jobId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/status?job_id=" + jobId))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            Map<?, ?> body = objectMapper.readValue(response.body(), Map.class);
            String status = (String) body.get("status");
            return status != null ? status : "not_found";
        } catch (Exception e) {
            return null; // Fisco inaccesibil — nu putem confirma nimic acum
        }
    }

    // GET /api/v1/status?job_id=... — status job specific
    public String getJobStatus(String jobId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/status?job_id=" + jobId))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (Exception e) {
            throw new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE");
        }
    }

    // GET /api/v1/status — lista ultimelor joburi
    public String getAllStatus() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/status"))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (Exception e) {
            throw new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE");
        }
    }

    // GET /api/v1/last-receipt — ultimul job finalizat
    public String getLastReceipt() {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/last-receipt"))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (Exception e) {
            throw new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE");
        }
    }

    // Polling pe /api/v1/status?job_id=... până la printed/failed sau timeout
    private String pollUntilDone(String jobId) throws Exception {
        long deadline = System.currentTimeMillis() + (long) POLL_TIMEOUT_SECONDS * 1000;

        while (System.currentTimeMillis() < deadline) {
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("ERROR.FISCAL.INTERRUPTED");
            }

            HttpRequest statusRequest = HttpRequest.newBuilder()
                    .uri(URI.create(FISCO_BASE + "/api/v1/status?job_id=" + jobId))
                    .timeout(Duration.ofSeconds(5))
                    .GET()
                    .build();

            // Un singur eșec de rețea la o verificare de status NU înseamnă că jobul s-a
            // pierdut — Fisco tot îl are, doar noi n-am reușit să-l întrebăm acum. Continuăm
            // polling-ul până la deadline în loc să renunțăm la primul hiccup (asta arunca
            // POLLING_LOST prematur, lăsând bonul FISCAL_PENDING deși jobul era încă proaspăt
            // în bufferul Fisco și s-ar fi confirmat la următoarea încercare).
            Map<?, ?> statusResult;
            try {
                HttpResponse<String> statusResponse = httpClient.send(statusRequest, HttpResponse.BodyHandlers.ofString());
                statusResult = objectMapper.readValue(statusResponse.body(), Map.class);
            } catch (Exception e) {
                continue;
            }
            String status = (String) statusResult.get("status");

            if ("printed".equals(status)) {
                return jobId;
            }
            if ("failed".equals(status)) {
                Map<?, ?> err = (Map<?, ?>) statusResult.get("error");
                String msg = err != null ? (String) err.get("message") : "print failed";
                throw new RuntimeException("ERROR.FISCAL.PRINT_FAILED|" + msg);
            }
            // queued / processing → continuăm polling
        }

        throw new RuntimeException("ERROR.FISCAL.TIMEOUT");
    }

    private BigDecimal sumByMethod(List<ReceiptPayment> payments, String methodCode) {
        return payments.stream()
                .filter(p -> methodCode.equals(p.getPaymentMethod().getCode()))
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // Discount valoric (tip 3) FPrint. Plasată imediat după o comandă S → se aplică doar acelei
    // linii; plasată după T (subtotal) → se aplică proporțional pe tot bonul de până atunci.
    private String buildDiscountCommand(BigDecimal amount) {
        return String.format(Locale.US, "C,1,______,_,__;3;%.2f;;;;", amount);
    }

    // Format FPrint pentru linie produs
    // S,1,______,_,__;<Denumire>;<Preț>;<Cantitate>;<Departament>;1;<TVA%>;0;0;<Unitate>
    private String buildProductCommand(ReceiptItem item) {
        String name = sanitizeName(item.getProduct().getName());
        BigDecimal price = item.getUnitPrice();
        BigDecimal qty = item.getQuantity();

        // NEPLATITOR TVA: se trimite indexul 5 către Fisco (neplatitor/scutit TVA).
        // PLATITOR TVA: decomentează linia de mai jos, comentează vatField = "5",
        // și reprogramează casa de marcat cu departamentele TVA corespunzătoare.
        // int vatPercent = item.getVatRate().setScale(0, RoundingMode.HALF_UP).intValue();
        // String vatField = vatPercent + "%";
        String vatField = "5";

        return String.format(Locale.US, "S,1,______,_,__;%s;%.2f;%.3f;1;1;%s;0;0;buc",
                name, price, qty, vatField);
    }

    // FPrint: max 72 caractere, fără ; (separator câmpuri)
    private String sanitizeName(String name) {
        if (name == null) return "Produs";
        name = name.replace(";", " ");
        return name.length() > 72 ? name.substring(0, 72) : name;
    }
}

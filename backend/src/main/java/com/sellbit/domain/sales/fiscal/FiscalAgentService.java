package com.sellbit.domain.sales.fiscal;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
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
import java.util.stream.Collectors;

@Service
public class FiscalAgentService {

    private static final String FISCO_BASE = "http://127.0.0.1:4040";
    private static final String FISCAL_WAREHOUSE = "GV";
    private static final int POLL_TIMEOUT_SECONDS = 45;
    private static final int POLL_INTERVAL_MS = 1000;

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

    // POST /api/v1/print + polling status până la printed/failed/timeout
    // Returnează job_id-ul Fisco
    public String printGvBon(Receipt receipt) {
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

        // Voucher, avans și transfer bancar GV → discount valoric (C tip 3) pe bon
        // (transferul bancar nu se fiscalizează — se facturează prin contabilitate)
        BigDecimal discountTotal = gvPayments.stream()
                .filter(p -> {
                    String code = p.getPaymentMethod().getCode();
                    return "VOUCHER".equals(code) || "ADVANCE".equals(code) || "BANK_TRANSFER".equals(code);
                })
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<String> commands = new ArrayList<>();

        for (ReceiptItem item : gvItems) {
            commands.add(buildProductCommand(item));
        }

        if (discountTotal.compareTo(BigDecimal.ZERO) > 0) {
            commands.add("T,1,______,_,__;4;;;;;");
            commands.add(String.format(Locale.US, "C,1,______,_,__;3;%.2f;;;;", discountTotal));
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

            HttpResponse<String> statusResponse = httpClient.send(statusRequest, HttpResponse.BodyHandlers.ofString());
            Map<?, ?> statusResult = objectMapper.readValue(statusResponse.body(), Map.class);
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

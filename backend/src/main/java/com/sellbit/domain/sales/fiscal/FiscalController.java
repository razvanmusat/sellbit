package com.sellbit.domain.sales.fiscal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/fiscal")
@RequiredArgsConstructor
@PreAuthorize("hasAnyAuthority('50', '100')")
public class FiscalController {

    private final FiscalAgentService fiscalAgentService;
    private final ReceiptFiscalService receiptFiscalService;

    // Frontend "bulina" — verifică dacă casa de marcat răspunde
    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> getStatus() {
        boolean active = fiscalAgentService.checkHealth();
        return ResponseEntity.ok(Map.of("active", active));
    }

    // Ultimul bon emis (info din Fisco)
    @GetMapping(value = "/last-receipt", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getLastReceipt() {
        return ResponseEntity.ok(fiscalAgentService.getLastReceipt());
    }

    // Rapoartele trec prin ReceiptFiscalService: același lock de serializare + reconcilierea
    // bonurilor cu răspuns pierdut, ca să nu polueze diff-ul de reconciliere cu joburi noi
    @PostMapping("/report-x")
    public ResponseEntity<Void> reportX() {
        receiptFiscalService.printReportX();
        return ResponseEntity.ok().build();
    }

    @PostMapping("/report-z")
    public ResponseEntity<Void> reportZ() {
        receiptFiscalService.printReportZ();
        return ResponseEntity.ok().build();
    }

    // Status job — cu job_id returnează acel job; fără returnează toate
    @GetMapping(value = "/job-status", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> getJobStatus(@RequestParam(required = false) String jobId) {
        if (jobId != null && !jobId.isBlank()) {
            return ResponseEntity.ok(fiscalAgentService.getJobStatus(jobId));
        }
        return ResponseEntity.ok(fiscalAgentService.getAllStatus());
    }
}

package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sales/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;

    /**
     * Deschide un bon nou.
     */
    @PostMapping
    public ResponseEntity<ReceiptDTOs.Response> create(@RequestBody @Valid ReceiptDTOs.CreateRequest request) {
        return ResponseEntity.ok(receiptService.createReceipt(request));
    }
    
    @GetMapping("/reports/profit")
    public ResponseEntity<BigDecimal> getProfit(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getGrossProfitReport(start, end));
    }
    
    /**
     * OPERAȚIONAL: Obține bonurile deschise pentru tab-ul de gestiune activ din React.
     * GET /api/sales/receipts/active?warehouseId=1
     */
    @GetMapping("/active")
    public ResponseEntity<List<ReceiptDTOs.Response>> getActive(@RequestParam Integer warehouseId) {
        return ResponseEntity.ok(receiptService.getActiveReceipts(warehouseId));
    }

    /**
     * RAPORTARE: Obține istoricul bonurilor filtrat după gestiune, status și perioadă.
     * GET /api/sales/receipts/report?warehouseId=1&status=CLOSED&start=...&end=...
     */
    @GetMapping("/report")
    public ResponseEntity<List<ReceiptDTOs.Response>> getReport(
            @RequestParam Integer warehouseId,
            @RequestParam String status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getReceiptsReport(warehouseId, status, start, end));
    }

    /**
     * Returnează lista de bonuri uitate deschise.
     */
    @GetMapping("/alerts")
    public ResponseEntity<List<ReceiptDTOs.UnclosedAlert>> getAlerts() {
        return ResponseEntity.ok(receiptService.getUnclosedAlerts());
    }

    /**
     * Anulează un bon deschis și returnează stocul.
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Integer id, @RequestParam Integer reasonId) {
        receiptService.cancelOpenReceipt(id, reasonId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Finalizează bonul.
     */
    @PostMapping("/{id}/close")
    public ResponseEntity<Void> close(@PathVariable Integer id) {
        receiptService.closeReceipt(id);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/{id}/refund")
    public ResponseEntity<ReceiptDTOs.Response> refund(@PathVariable Integer id, @RequestBody @Valid ReceiptDTOs.RefundRequest request) {
        return ResponseEntity.ok(receiptService.createPartialRefund(id, request));
    }
    
    @GetMapping("/{id}/print-bill-note")
    public ResponseEntity<ReceiptPrintDTO> getBillNoteForPrint(@PathVariable Integer id) {
        return ResponseEntity.ok(receiptService.getBillNoteData(id));
    }
    
    @DeleteMapping("/{receiptId}/payments/{paymentId}/voucher")
    public ResponseEntity<Void> removeVoucher(@PathVariable Integer receiptId, @PathVariable Integer paymentId) {
        receiptService.removeVoucherPayment(receiptId, paymentId);
        return ResponseEntity.ok().build();
    }
}
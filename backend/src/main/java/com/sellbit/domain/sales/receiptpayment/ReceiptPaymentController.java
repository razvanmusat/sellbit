package com.sellbit.domain.sales.receiptpayment;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/sales/receipt-payments")
@RequiredArgsConstructor
public class ReceiptPaymentController {

    private final ReceiptPaymentService paymentService;

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping
    public ResponseEntity<Void> addPayment(
            @RequestParam Integer receiptId,
            @RequestParam Integer paymentMethodId,
            @RequestParam BigDecimal amount,
            @RequestParam Integer userId,
            @RequestParam(required = false) Integer warehouseId) {

        paymentService.addPayment(receiptId, paymentMethodId, amount, userId, warehouseId);
        return ResponseEntity.ok().build();
    }

    /**
     * Preview voucher — returnează suma calculată fără a consuma voucherul.
     * Folosit de frontend pentru a afișa picker-ul de distribuție per gestiune.
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/voucher-preview")
    public ResponseEntity<ReceiptPaymentDTO.VoucherPreview> previewVoucher(
            @RequestParam Integer receiptId,
            @RequestParam String voucherCode) {

        return ResponseEntity.ok(paymentService.previewVoucher(receiptId, voucherCode));
    }

    /**
     * Aplică un voucher pe bon.
     * Body opțional — dacă distributions e furnizat, creează câte o plată per gestiune.
     * Dacă distributions e null → plată unică fără gestiune (comportament vechi).
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/apply-voucher")
    public ResponseEntity<Void> applyVoucher(
            @RequestParam Integer receiptId,
            @RequestParam String voucherCode,
            @RequestParam Integer userId,
            @RequestBody(required = false) ReceiptPaymentDTO.VoucherDistributionsWrapper body) {

        List<ReceiptPaymentDTO.VoucherDistribution> distributions =
                body != null ? body.distributions() : null;
        paymentService.applyVoucher(receiptId, voucherCode, userId, distributions);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removePayment(
            @PathVariable Integer id,
            @RequestParam Integer userId) {

        paymentService.removePayment(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<ReceiptPaymentDTO.Response>> getPaymentsByReceipt(
            @PathVariable Integer receiptId) {
        return ResponseEntity.ok(paymentService.getPaymentsByReceipt(receiptId));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report/sum")
    public ResponseEntity<List<ReceiptPaymentDTO.ReportResponse>> getPaymentsReport(
            @RequestParam(required = false) Integer warehouseId,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(
                    iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(
                    iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) String methodCode) {

        return ResponseEntity.ok(paymentService.getPaymentsReport(start, end, methodCode, warehouseId));
    }
}
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
    @PostMapping // Adaugă o plată pe bon deschis. "Cash" actualizează automat și sertarul de bani
    public ResponseEntity<Void> addPayment(
            @RequestParam Integer receiptId,
            @RequestParam Integer paymentMethodId,
            @RequestParam BigDecimal amount,
            @RequestParam Integer userId) {

        paymentService.addPayment(receiptId, paymentMethodId, amount, userId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/apply-voucher") // Aplică un voucher pe bonul deschis. Scade valoarea voucherului din totalul de plată.
    public ResponseEntity<Void> applyVoucher(
            @RequestParam Integer receiptId,
            @RequestParam String voucherCode,
            @RequestParam Integer userId) {

        paymentService.applyVoucher(receiptId, voucherCode, userId);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @DeleteMapping("/{id}") // Șterge o plată de pe bon (doar dacă bonul este încă deschis). "CASH" scoate banii înapoi din sertar
    public ResponseEntity<Void> removePayment(
            @PathVariable Integer id,
            @RequestParam Integer userId) {

        paymentService.removePayment(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/receipt/{receiptId}") // Obține toate plățile pentru un anumit bon. Folosit in UI pentru a afișa platit vs rest.
    public ResponseEntity<List<ReceiptPaymentDTO.Response>> getPaymentsByReceipt(@PathVariable Integer receiptId) {
        return ResponseEntity.ok(paymentService.getPaymentsByReceipt(receiptId));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report/sum") //RAPORT: Total încasări pe metode de plată. Câți bani incasti azi CASH vs CARD.
    public ResponseEntity<ReceiptPaymentDTO.ReportResponse> getPaymentsReport(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
            @RequestParam(required = false) String methodCode) {

        return ResponseEntity.ok(paymentService.getPaymentsReport(start, end, methodCode));
    }
}
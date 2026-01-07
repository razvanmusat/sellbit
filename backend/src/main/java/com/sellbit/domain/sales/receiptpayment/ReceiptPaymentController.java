package com.sellbit.domain.sales.receiptpayment;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/sales/receipt-payments")
@RequiredArgsConstructor
public class ReceiptPaymentController {

    private final ReceiptPaymentService paymentService;
    
    /**
     * Adaugă o plată pe bon.
     * Acum include și userId pentru a putea înregistra mișcarea în sertarul de bani.
     */
    @PostMapping
    public ResponseEntity<Void> addPayment(
            @RequestParam Integer receiptId,
            @RequestParam Integer paymentMethodId,
            @RequestParam BigDecimal amount,
            @RequestParam Integer userId) {
        
        paymentService.addPayment(receiptId, paymentMethodId, amount, userId);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/apply-voucher")
    public ResponseEntity<Void> applyVoucher(
            @RequestParam Integer receiptId,
            @RequestParam String voucherCode,
            @RequestParam Integer userId) {
        
        paymentService.applyVoucher(receiptId, voucherCode, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Șterge o plată.
     * Avem nevoie de userId pentru a înregistra "ieșirea" banilor din sertar dacă plata a fost Cash.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removePayment(
            @PathVariable Integer id,
            @RequestParam Integer userId) {
        
        paymentService.removePayment(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<ReceiptPaymentDTO.Response>> getPaymentsByReceipt(@PathVariable Integer receiptId) {
        // SCHIMBĂ AICI: din paymentRepository.findByReceiptId în paymentService.getPaymentsByReceipt
        return ResponseEntity.ok(paymentService.getPaymentsByReceipt(receiptId));
    }
}
package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethodRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptPaymentService {

    private final ReceiptPaymentRepository paymentRepository;
    private final ReceiptRepository receiptRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final CashMovementService cashMovementService;

    /**
     * Adaugă o plată pe bon. 
     * Actualizează automat CashDrawer dacă metoda de plată este CASH.
     */
    @Transactional
    public void addPayment(Integer receiptId, Integer paymentMethodId, BigDecimal amount, Integer userId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        PaymentMethod method = paymentMethodRepository.findById(paymentMethodId)
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

        // Calculăm cât s-a plătit deja pentru a determina restul necesar
        BigDecimal alreadyPaid = receipt.getPayments().stream()
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingToPay = receipt.getTotalAmount().subtract(alreadyPaid);
        BigDecimal amountToRecord = amount;

        if ("CASH".equals(method.getCode())) {
            // Dacă suma primită e mai mare decât restul, încasăm doar restul (restul banilor se dau înapoi clientului)
            if (amount.compareTo(remainingToPay) > 0) {
                amountToRecord = remainingToPay;
            }
        } else {
            // Pentru CARD/VOUCHER nu permitem depășirea totalului
            if (amount.compareTo(remainingToPay) > 0) {
                throw new RuntimeException("ERROR.PAYMENT.EXCEEDS_TOTAL");
            }
        }

        // 1. Salvăm plata în baza de date
        ReceiptPayment payment = ReceiptPayment.builder()
                .receipt(receipt)
                .paymentMethod(method)
                .amount(amountToRecord)
                .build();

        receipt.addPayment(payment);
        paymentRepository.save(payment);

        // 2. Sincronizăm cu sertarul de bani (Update Live + Movement)
        if ("CASH".equals(method.getCode())) {
            cashMovementService.createMovement(
                receipt.getWarehouse().getId(),
                "SALE",
                amountToRecord,
                userId,
                "Încasare bon nr. " + receipt.getId()
            );
        }
    }

    /**
     * Șterge o plată și scade suma din sertarul de bani dacă a fost CASH.
     */
    @Transactional
    public void removePayment(Integer paymentId, Integer userId) {
        ReceiptPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT.NOT_FOUND"));
        
        Receipt receipt = payment.getReceipt();
        
        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.ALREADY_CLOSED");
        }

        // Dacă ștergem o plată CASH, trebuie să scădem banii din CashDrawer
        if ("CASH".equals(payment.getPaymentMethod().getCode())) {
            cashMovementService.createMovement(
                receipt.getWarehouse().getId(),
                "REFUND",
                payment.getAmount(), // Suma devine negativă pentru a scădea din sold
                userId,
                "Anulare plată bon nr. " + receipt.getId()
            );
        }

        paymentRepository.delete(payment);
    }
    
    @Transactional(readOnly = true)
    public List<ReceiptPaymentDTO.Response> getPaymentsByReceipt(Integer receiptId) {
        return paymentRepository.findByReceiptId(receiptId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    private ReceiptPaymentDTO.Response mapToResponse(ReceiptPayment payment) {
        return new ReceiptPaymentDTO.Response(
                payment.getId(),
                payment.getPaymentMethod().getId(),
                payment.getPaymentMethod().getLabel(), // MODIFICAT AICI: getLabel() în loc de getName()
                payment.getPaymentMethod().getCode(),
                payment.getAmount(),
                payment.getPaidAt()
        );
    }
}
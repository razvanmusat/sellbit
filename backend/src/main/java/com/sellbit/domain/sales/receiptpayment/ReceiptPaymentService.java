package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethodRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucher;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherRepository;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptPaymentService {

    private final ReceiptPaymentRepository paymentRepository;
    private final ReceiptRepository receiptRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final CashMovementService cashMovementService;
    private final CustomerVoucherService voucherService;
    private final CustomerVoucherRepository voucherRepository;

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

        if ("CASH".equals(method.getCode()) || "VOUCHER".equals(method.getCode())) {
            // Pentru CASH: suma primită e mai mare → încasăm doar restul (restul banilor se dau înapoi)
            // Pentru VOUCHER: voucher mai mare → se consumă doar restul (clientul pierde diferența)
            if (amount.compareTo(remainingToPay) > 0) {
                amountToRecord = remainingToPay;
            }
        } else {
            // Pentru CARD/BANK_TRANSFER nu permitem depășirea totalului
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
                    "Încasare bon nr. " + receipt.getId() + " Masa: " + receipt.getTableName());
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
                    "Anulare plată bon nr. " + receipt.getId() + " Masa: " + receipt.getTableName());
        }

        if ("VOUCHER".equals(payment.getPaymentMethod().getCode())) {
            // Căutăm voucherul care a fost folosit pentru acest bon
            // Avem nevoie de o metodă în voucherRepository sau service
            voucherService.cancelVoucherUsage(payment.getReceipt().getId());
        }

        paymentRepository.delete(payment);
    }

    @Transactional(readOnly = true)
    public List<ReceiptPaymentDTO.Response> getPaymentsByReceipt(Integer receiptId) {
        return paymentRepository.findByReceiptId(receiptId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public void applyVoucher(Integer receiptId, String voucherCode, Integer userId) {
        // 1. Căutăm bonul
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        // 2. Validăm voucherul (Expirare, deja folosit, etc.)
        // Folosim metoda existentă din CustomerVoucherService
        var validation = voucherService.validateCode(voucherCode);
        if (!validation.isValid()) {
            throw new RuntimeException(validation.errorCode());
        }

        // 3. Recăuperăm entitatea completă a voucherului
        CustomerVoucher voucher = voucherRepository.findByCode(voucherCode)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER.NOT_FOUND"));

        // 4. Calculăm VALOAREA monetară a voucherului pentru acest bon
        BigDecimal voucherAmount = voucherService.calculateVoucherValue(voucher, receipt);

        if (voucherAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("ERROR.VOUCHER.NO_APPLICABLE_ITEMS");
        }

        // 4.1. Verificăm cât s-a plătit deja
        BigDecimal alreadyPaid = receipt.getPayments().stream()
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal remainingToPay = receipt.getTotalAmount().subtract(alreadyPaid);
        
        // 4.2. Dacă există DEJA plăți pe bon și voucherul nu se poate folosi complet → EROARE
        // Excepție: Dacă bonul e gol (alreadyPaid == 0), permit voucher mai mare (clientul își asumă pierderea)
        if (alreadyPaid.compareTo(BigDecimal.ZERO) > 0 && voucherAmount.compareTo(remainingToPay) > 0) {
            throw new RuntimeException("ERROR.VOUCHER.DELETE_PAYMENTS_FIRST");
        }

        // 5. Identificăm Metoda de Plată "VOUCHER" din nomenclator
        PaymentMethod voucherMethod = paymentMethodRepository.findByCode("VOUCHER")
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.VOUCHER_NOT_CONFIGURED"));

        // 6. Adăugăm plata efectivă pe bon
        // Reutilizăm logica de bază, dar cu suma calculată
        this.addPayment(receiptId, voucherMethod.getId(), voucherAmount, userId);

        // 7. Consumăm voucherul (îl legăm de acest bon și îl marcăm ca folosit)
        voucherService.consumeVoucher(voucherCode, receipt);
    }

    public List<ReceiptPaymentDTO.ReportResponse> getPaymentsReport(
            LocalDateTime start, 
            LocalDateTime end,
            String methodCode, 
            Integer warehouseId) {
        
        List<ReceiptPaymentDTO.ReportResponse> reports = new ArrayList<>();
        
        // Dacă se cere o metodă specifică, returnez doar pentru acea metodă
        if (methodCode != null && !methodCode.isEmpty()) {
            BigDecimal total = paymentRepository.calculatePaymentsSum(start, end, methodCode, warehouseId);
            reports.add(new ReceiptPaymentDTO.ReportResponse(total, methodCode, start, end));
        } else {
            // Altfel, returnez date pentru TOATE metodele de plată
            List<PaymentMethod> allMethods = paymentMethodRepository.findAll();
            for (PaymentMethod method : allMethods) {
                BigDecimal total = paymentRepository.calculatePaymentsSum(start, end, method.getCode(), warehouseId);
                reports.add(new ReceiptPaymentDTO.ReportResponse(total, method.getCode(), start, end));
            }
        }
        
        return reports;
    }

    private ReceiptPaymentDTO.Response mapToResponse(ReceiptPayment payment) {
        return new ReceiptPaymentDTO.Response(
                payment.getId(),
                payment.getPaymentMethod().getId(),
                payment.getPaymentMethod().getLabel(), // MODIFICAT AICI: getLabel() în loc de getName()
                payment.getPaymentMethod().getCode(),
                payment.getAmount(),
                payment.getPaidAt());
    }
}
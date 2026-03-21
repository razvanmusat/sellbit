package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
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
    private final WarehouseRepository warehouseRepository;
    private final CashMovementService cashMovementService;
    private final CustomerVoucherService voucherService;
    private final CustomerVoucherRepository voucherRepository;

    /**
     * Adaugă o plată pe bon.
     * warehouseId — gestiunea pe care merge mișcarea de numerar CASH.
     * Null pentru VOUCHER (distribuit separat) sau alte metode fără sertar.
     */
    @Transactional
    public void addPayment(Integer receiptId, Integer paymentMethodId,
            BigDecimal amount, Integer userId, Integer warehouseId) {

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        PaymentMethod method = paymentMethodRepository.findById(paymentMethodId)
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

        BigDecimal alreadyPaid = receipt.getPayments().stream()
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingToPay = receipt.getTotalAmount().subtract(alreadyPaid);
        BigDecimal amountToRecord = amount;

        if ("CASH".equals(method.getCode()) || "VOUCHER".equals(method.getCode())) {
            if (amount.compareTo(remainingToPay) > 0) {
                amountToRecord = remainingToPay;
            }
        } else {
            if (amount.compareTo(remainingToPay) > 0) {
                throw new RuntimeException("ERROR.PAYMENT.EXCEEDS_TOTAL");
            }
        }

        Warehouse warehouse = null;
        if (warehouseId != null) {
            warehouse = warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));
        }

        ReceiptPayment payment = ReceiptPayment.builder()
                .receipt(receipt)
                .paymentMethod(method)
                .amount(amountToRecord)
                .warehouse(warehouse)
                .build();

        receipt.addPayment(payment);
        paymentRepository.save(payment);

        if ("CASH".equals(method.getCode()) && warehouse != null) {
            cashMovementService.createMovement(
                    warehouse.getId(),
                    "SALE",
                    amountToRecord,
                    userId,
                    "Încasare bon nr. " + receipt.getId() + " Masa: " + receipt.getTableName(),
                    receipt.getId());
        }
    }

    /**
     * Șterge o plată și inversează mișcarea de numerar dacă a fost CASH.
     */
    @Transactional
    public void removePayment(Integer paymentId, Integer userId) {
        ReceiptPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT.NOT_FOUND"));

        Receipt receipt = payment.getReceipt();

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.ALREADY_CLOSED");
        }

        if ("CASH".equals(payment.getPaymentMethod().getCode())
                && payment.getWarehouse() != null) {
            cashMovementService.createMovement(
                    payment.getWarehouse().getId(),
                    "REFUND",
                    payment.getAmount(),
                    userId,
                    "Anulare plată bon nr. " + receipt.getId() + " Masa: " + receipt.getTableName(),
                    receipt.getId());
        }

        if ("VOUCHER".equals(payment.getPaymentMethod().getCode())) {
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

    /**
     * Preview voucher — calculează suma fără a consuma voucherul.
     * Folosit de frontend pentru a afișa distribuția per gestiune.
     */
    @Transactional(readOnly = true)
    public ReceiptPaymentDTO.VoucherPreview previewVoucher(Integer receiptId, String voucherCode) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        var validation = voucherService.validateCode(voucherCode);
        if (!validation.isValid()) {
            throw new RuntimeException(validation.errorCode());
        }

        CustomerVoucher voucher = voucherRepository.findByCode(voucherCode)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER.NOT_FOUND"));

        BigDecimal amount = voucherService.calculateVoucherValue(voucher, receipt);
        return new ReceiptPaymentDTO.VoucherPreview(amount);
    }

    /**
     * Aplică un voucher pe bon.
     *
     * Dacă distributions e furnizat → creează câte o plată per gestiune, cu warehouseId explicit.
     * Dacă distributions e null → plată unică fără gestiune (fallback pentru bon cu o singură gestiune).
     *
     * Voucherul este consumat o singură dată indiferent de numărul de distribuții.
     */
    @Transactional
    public void applyVoucher(Integer receiptId, String voucherCode, Integer userId,
            List<ReceiptPaymentDTO.VoucherDistribution> distributions) {

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        var validation = voucherService.validateCode(voucherCode);
        if (!validation.isValid()) {
            throw new RuntimeException(validation.errorCode());
        }

        CustomerVoucher voucher = voucherRepository.findByCode(voucherCode)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER.NOT_FOUND"));

        BigDecimal voucherAmount = voucherService.calculateVoucherValue(voucher, receipt);

        if (voucherAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("ERROR.VOUCHER.NO_APPLICABLE_ITEMS");
        }

        BigDecimal alreadyPaid = receipt.getPayments().stream()
                .map(ReceiptPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingToPay = receipt.getTotalAmount().subtract(alreadyPaid);

        if (alreadyPaid.compareTo(BigDecimal.ZERO) > 0 && voucherAmount.compareTo(remainingToPay) > 0) {
            throw new RuntimeException("ERROR.VOUCHER.DELETE_PAYMENTS_FIRST");
        }

        PaymentMethod voucherMethod = paymentMethodRepository.findByCode("VOUCHER")
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.VOUCHER_NOT_CONFIGURED"));

        if (distributions == null || distributions.isEmpty()) {
            // Plată unică fără gestiune
            createVoucherPayment(receipt, voucherMethod, voucherAmount, null);
        } else {
            // Câte o plată per gestiune — nu trecem prin addPayment ca să evităm
            // recalculul remaining la fiecare iterație
            for (ReceiptPaymentDTO.VoucherDistribution dist : distributions) {
                Warehouse warehouse = dist.warehouseId() != null
                        ? warehouseRepository.findById(dist.warehouseId())
                                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"))
                        : null;
                createVoucherPayment(receipt, voucherMethod, dist.amount(), warehouse);
            }
        }

        voucherService.consumeVoucher(voucherCode, receipt);
    }

    private void createVoucherPayment(Receipt receipt, PaymentMethod method,
            BigDecimal amount, Warehouse warehouse) {
        ReceiptPayment payment = ReceiptPayment.builder()
                .receipt(receipt)
                .paymentMethod(method)
                .amount(amount)
                .warehouse(warehouse)
                .build();
        receipt.addPayment(payment);
        paymentRepository.save(payment);
    }

    public List<ReceiptPaymentDTO.ReportResponse> getPaymentsReport(
            LocalDateTime start, LocalDateTime end,
            String methodCode, Integer warehouseId) {

        List<ReceiptPaymentDTO.ReportResponse> reports = new ArrayList<>();

        if (methodCode != null && !methodCode.isEmpty()) {
            BigDecimal total = paymentRepository.calculatePaymentsSum(start, end, methodCode, warehouseId);
            reports.add(new ReceiptPaymentDTO.ReportResponse(total, methodCode, start, end));
        } else {
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
            payment.getPaymentMethod().getLabel(),
            payment.getPaymentMethod().getCode(),
            payment.getAmount(),
            payment.getWarehouse() != null ? payment.getWarehouse().getId() : null,
            payment.getWarehouse() != null ? payment.getWarehouse().getName() : null,
            payment.getPaidAt());
}
}
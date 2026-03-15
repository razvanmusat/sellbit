package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class ReceiptPaymentDTO {

    public record Response(
            Integer id,
            Integer paymentMethodId,
            String paymentMethodLabel,
            String paymentMethodCode,
            BigDecimal amount,
            Integer warehouseId,
            LocalDateTime paidAt) {
    }

    public record ReportResponse(
            BigDecimal total,
            String methodCode,
            LocalDateTime start,
            LocalDateTime end) {
    }

    /**
     * Distribuție voucher per gestiune.
     * Frontend calculează distribuția, backend validează și salvează.
     */
    public record VoucherDistribution(Integer warehouseId, BigDecimal amount) {}

    /**
     * Wrapper pentru body-ul opțional din apply-voucher.
     */
    public record VoucherDistributionsWrapper(List<VoucherDistribution> distributions) {}

    /**
     * Preview voucher — returnează suma calculată fără a consuma voucherul.
     */
    public record VoucherPreview(BigDecimal amount) {}
}
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
            String warehouseName,
            LocalDateTime paidAt,
            String voucherCode) {
    }

    public record ReportResponse(
            BigDecimal total,
            String methodCode,
            LocalDateTime start,
            LocalDateTime end) {
    }

    public record VoucherDistribution(Integer warehouseId, BigDecimal amount) {}

    public record VoucherDistributionsWrapper(List<VoucherDistribution> distributions) {}

    public record VoucherPreview(BigDecimal amount) {}
}
package com.sellbit.domain.voucher.customervoucher;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CustomerVoucherDTOs {

    /**
     * Răspunsul pentru validare la POS.
     */
    public record ValidationResponse(
        String code,
        String discountType,
        BigDecimal discountValue,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        LocalDateTime usedAt,
        String status,
        Boolean isValid,
        String errorCode
    ) {}

    /**
     * Request pentru consumare cod.
     */
    public record ConsumeRequest(
        String code,
        Integer receiptId
    ) {}

    /**
     * DTO pentru listarea voucherelor în tabele (Admin/Raportare).
     * Include informații despre campania mamă și status.
     */
    public record SummaryResponse(
        Integer id,
        String code,
        String campaignName,
        String discountType,
        BigDecimal discountValue,
        LocalDateTime expiresAt,
        String status,
        Boolean used,
        LocalDateTime createdAt,
        LocalDateTime usedAt,
        Integer issuedReceiptId,
        Integer usedReceiptId
    ) {}
}
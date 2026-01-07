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
        Boolean used,
        LocalDateTime createdAt
    ) {}
}
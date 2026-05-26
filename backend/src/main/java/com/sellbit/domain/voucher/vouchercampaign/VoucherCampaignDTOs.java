package com.sellbit.domain.voucher.vouchercampaign;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class VoucherCampaignDTOs {

    public record Request(
        @NotBlank(message = "ERROR.VOUCHER_CAMPAIGN.NAME_REQUIRED")
        @Size(max = 100, message = "ERROR.VOUCHER_CAMPAIGN.NAME_TOO_LONG")
        String name,

        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.START_DATE_REQUIRED")
        LocalDate validFromDate,

        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.END_DATE_REQUIRED")
        LocalDate validUntilDate,

        // Nullable pt GIFT_CARD (valoarea vine din bon)
        @Size(max = 50, message = "ERROR.VOUCHER_CAMPAIGN.TYPE_TOO_LONG")
        String discountType,

        // Nullable pt GIFT_CARD
        @Digits(integer = 8, fraction = 2, message = "ERROR.VOUCHER_CAMPAIGN.INVALID_FORMAT")
        BigDecimal discountValue,

        @Digits(integer = 8, fraction = 2, message = "ERROR.VOUCHER_CAMPAIGN.INVALID_FORMAT")
        BigDecimal maxDiscountAmount,

        // Nullable pt GIFT_CARD (nu are suma minima — vanzarea e manuala)
        @DecimalMin(value = "0.0", message = "ERROR.VOUCHER_CAMPAIGN.MIN_AMOUNT_POSITIVE")
        @Digits(integer = 8, fraction = 2)
        BigDecimal minAmount,

        @Min(value = 0, message = "ERROR.VOUCHER_CAMPAIGN.HOURS_POSITIVE")
        Integer minHoursPlayed,

        List<Integer> requiredProductIds,
        Integer applicableProductId,

        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.DAYS_REQUIRED")
        @Min(value = 1, message = "ERROR.VOUCHER_CAMPAIGN.DAYS_MIN_1")
        Integer validDays,

        @Size(max = 50, message = "ERROR.VOUCHER_CAMPAIGN.DAYS_STRING_TOO_LONG")
        @Pattern(regexp = "^[1-7](,[1-7])*$", message = "ERROR.VOUCHER_CAMPAIGN.INVALID_DAYS_FORMAT")
        String applicableDays,

        @Size(max = 20, message = "ERROR.VOUCHER_CAMPAIGN.PREFIX_TOO_LONG")
        @Pattern(regexp = "^[A-Z0-9\\-]+$", message = "ERROR.VOUCHER_CAMPAIGN.PREFIX_INVALID_CHARS")
        String prefix,

        @Min(value = 3, message = "ERROR.VOUCHER_CAMPAIGN.CODE_TOO_SHORT")
        @Max(value = 20, message = "ERROR.VOUCHER_CAMPAIGN.CODE_TOO_LONG")
        Integer codeLength,

        String receiptTemplate,

        // --- CÂMPURI NOI ---
        @NotBlank(message = "ERROR.VOUCHER_CAMPAIGN.TYPE_REQUIRED")
        String campaignType,         // REGULAR / GIFT_CARD / LOYALTY

        @Min(value = 1) Integer vouchersPerReceipt,  // nullable → default 1
        @Min(value = 1) Integer stampsRequired        // nullable, doar pt LOYALTY
    ) {}

    public record Response(
        Integer id,
        String name,
        LocalDate validFromDate,
        LocalDate validUntilDate,
        Boolean active,
        String discountType,
        BigDecimal discountValue,
        BigDecimal maxDiscountAmount,
        BigDecimal minAmount,
        Integer minHoursPlayed,
        String applicableDays,
        List<Integer> requiredProductIds,
        Integer applicableProductId,
        List<String> requiredProductNames,
        String applicableProductName,
        Integer validDays,
        String prefix,
        Integer codeLength,
        String receiptTemplate,
        // --- CÂMPURI NOI ---
        String campaignType,
        String campaignTypeLabel,
        Integer vouchersPerReceipt,
        Integer stampsRequired
    ) {}

    public record ActiveGiftCardResponse(
        boolean active,
        Integer campaignId
    ) {}
}

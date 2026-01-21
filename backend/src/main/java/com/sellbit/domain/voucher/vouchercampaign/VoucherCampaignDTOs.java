package com.sellbit.domain.voucher.vouchercampaign;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public class VoucherCampaignDTOs {

    public record Request(
        @NotBlank(message = "ERROR.VOUCHER_CAMPAIGN.NAME_REQUIRED")
        @Size(max = 100, message = "ERROR.VOUCHER_CAMPAIGN.NAME_TOO_LONG") 
        String name,

        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.START_DATE_REQUIRED")
        LocalDate validFromDate,

        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.END_DATE_REQUIRED")
        LocalDate validUntilDate,

        @NotBlank(message = "ERROR.VOUCHER_CAMPAIGN.DISCOUNT_TYPE_REQUIRED")
        @Size(max = 50, message = "ERROR.VOUCHER_CAMPAIGN.TYPE_TOO_LONG") 
        String discountType,

        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.DISCOUNT_VALUE_REQUIRED")
        @DecimalMin(value = "0.0", inclusive = false, message = "ERROR.VOUCHER_CAMPAIGN.VALUE_MUST_BE_POSITIVE")
        @Digits(integer = 8, fraction = 2, message = "ERROR.VOUCHER_CAMPAIGN.INVALID_FORMAT") // Previne overflow DB
        BigDecimal discountValue,

        @DecimalMin(value = "0.0", message = "ERROR.VOUCHER_CAMPAIGN.MIN_AMOUNT_POSITIVE")
        @Digits(integer = 8, fraction = 2)
        BigDecimal minAmount,

        @Min(value = 0, message = "ERROR.VOUCHER_CAMPAIGN.HOURS_POSITIVE")
        Integer minHoursPlayed,

        Integer requiredProductId,
        Integer applicableProductId,

        @Min(value = 1, message = "ERROR.VOUCHER_CAMPAIGN.DAYS_MIN_1")
        Integer validDays,

        @Size(max = 50, message = "ERROR.VOUCHER_CAMPAIGN.DAYS_STRING_TOO_LONG")
        @Pattern(regexp = "^[1-7](,[1-7])*$", message = "ERROR.VOUCHER_CAMPAIGN.INVALID_DAYS_FORMAT") 
        String applicableDays,

        @Size(max = 20, message = "ERROR.VOUCHER_CAMPAIGN.PREFIX_TOO_LONG")
        @Pattern(regexp = "^[A-Z0-9\\-]+$", message = "ERROR.VOUCHER_CAMPAIGN.PREFIX_INVALID_CHARS") // Opțional: Doar litere mari, cifre și cratimă
        String prefix,

        @Min(value = 3, message = "ERROR.VOUCHER_CAMPAIGN.CODE_TOO_SHORT")
        @Max(value = 20, message = "ERROR.VOUCHER_CAMPAIGN.CODE_TOO_LONG")
        Integer codeLength,

        String receiptTemplate
    ) {}

    public record Response(
        Integer id,
        String name,
        LocalDate validFromDate,
        LocalDate validUntilDate,
        Boolean active,
        String discountType,
        BigDecimal discountValue,
        String applicableDays,
        Integer requiredProductId,
        Integer applicableProductId
    ) {}
}
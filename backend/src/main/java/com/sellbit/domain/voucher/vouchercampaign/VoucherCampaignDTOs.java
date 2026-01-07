package com.sellbit.domain.voucher.vouchercampaign;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public class VoucherCampaignDTOs {

    public record Request(
        @NotBlank(message = "ERROR.VOUCHER_CAMPAIGN.NAME_REQUIRED")
        String name,
        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.START_DATE_REQUIRED")
        LocalDate validFromDate,
        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.END_DATE_REQUIRED")
        LocalDate validUntilDate,
        @NotBlank(message = "ERROR.VOUCHER_CAMPAIGN.DISCOUNT_TYPE_REQUIRED")
        String discountType,
        @NotNull(message = "ERROR.VOUCHER_CAMPAIGN.DISCOUNT_VALUE_REQUIRED")
        @DecimalMin(value = "0.0", inclusive = false)
        BigDecimal discountValue,
        BigDecimal minAmount,
        Integer minHoursPlayed,
        Integer requiredProductId,
        Integer applicableProductId,
        Integer validDays,
        String applicableDays,
        String prefix,
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
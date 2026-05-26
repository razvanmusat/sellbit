package com.sellbit.domain.voucher.customervoucher;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CustomerVoucherDTOs {

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

    public record ConsumeRequest(
        String code,
        Integer receiptId
    ) {}

    public record SummaryResponse(
        Integer id,
        String code,
        String campaignName,
        String campaignType,
        String discountType,
        BigDecimal discountValue,
        LocalDateTime expiresAt,
        String status,
        Boolean used,
        LocalDateTime createdAt,
        LocalDateTime usedAt,
        Integer issuedReceiptId,
        Integer usedReceiptId,
        Integer stampsRequired,
        String receiptTemplate
    ) {}

    // --- EMITERE VOUCHER (după closeReceipt) ---

    /** Un voucher emis — date necesare pentru print */
    public record IssuedVoucherInfo(
        Integer id,
        String code,
        String campaignName,
        String campaignType,     // REGULAR / LOYALTY / GIFT_CARD
        String discountType,
        BigDecimal discountValue,
        LocalDateTime expiresAt,
        Integer validDays,
        String applicableDays,
        Integer stampsRequired,  // doar pt LOYALTY
        String receiptTemplate   // instructiuni campanie pentru print
    ) {}

    /** Campanie LOYALTY triggerată — casierul alege voucher nou sau ștampilă */
    public record LoyaltyCampaignInfo(
        Integer campaignId,
        String campaignName,
        Integer stampsRequired,
        String discountType,
        BigDecimal discountValue
    ) {}

    /** Rezultatul complet al checkAndIssueVouchers */
    public record VoucherIssuanceResult(
        List<IssuedVoucherInfo> vouchers,        // REGULAR: de printat imediat
        LoyaltyCampaignInfo loyaltyCampaign      // LOYALTY: dialog casier, sau null
    ) {}

    // --- LOYALTY STATS (tab admin) ---

    public record StampLogEntry(
        Integer id,
        String cashierName,
        Integer receiptId,
        LocalDateTime givenAt
    ) {}

    public record LoyaltyStats(
        Integer campaignId,
        String campaignName,
        Integer stampsRequired,
        long vouchersIssued,
        long vouchersUsed,
        long stampsGiven,
        List<StampLogEntry> stampHistory
    ) {}
}

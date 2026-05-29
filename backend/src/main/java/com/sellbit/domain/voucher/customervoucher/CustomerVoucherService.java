package com.sellbit.domain.voucher.customervoucher;

import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import com.sellbit.domain.voucher.stamplog.StampLog;
import com.sellbit.domain.voucher.stamplog.StampLogRepository;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaign;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerVoucherService {

    private final CustomerVoucherRepository voucherRepository;
    private final VoucherCampaignRepository campaignRepository;
    private final ReceiptRepository receiptRepository;
    private final StampLogRepository stampLogRepository;
    private final UserRepository userRepository;

    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    // --- LISTARE ---

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getUsedVouchers() {
        return voucherRepository.findAllByUsedTrueOrderByUsedAtDesc().stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getAvailableVouchers() {
        return voucherRepository.findAvailable(LocalDateTime.now()).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getAvailableVouchers(LocalDate fromDate, LocalDate toDate) {
        return voucherRepository.findAvailableBetween(fromDate, toDate, LocalDateTime.now()).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getUsedVouchers(LocalDate fromDate, LocalDate toDate) {
        return voucherRepository.findUsedBetween(fromDate, toDate).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getVouchersByIssuedReceipt(Integer receiptId) {
        return voucherRepository.findAllByIssuedReceiptId(receiptId).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    // --- VALIDARE & CONSUM ---

    @Transactional(readOnly = true)
    public CustomerVoucherDTOs.ValidationResponse validateCode(String code) {
        if (code == null) throw new RuntimeException("ERROR.CODE_REQUIRED");
        code = code.trim().toUpperCase();

        CustomerVoucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("ERROR.CUSTOMER_VOUCHER.NOT_FOUND"));

        String errorCode = null;
        boolean isValid = true;

        if (Boolean.TRUE.equals(voucher.getUsed())) {
            errorCode = "ERROR.CUSTOMER_VOUCHER.ALREADY_USED";
            isValid = false;
        } else if (voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            errorCode = "ERROR.CUSTOMER_VOUCHER.EXPIRED";
            isValid = false;
        } else if (!isDayValid(voucher.getCampaign())) {
            errorCode = "ERROR.CUSTOMER_VOUCHER.INVALID_DAY";
            isValid = false;
        }

        return new CustomerVoucherDTOs.ValidationResponse(
                voucher.getCode(),
                voucher.getDiscountType(),
                voucher.getDiscountValue(),
                voucher.getExpiresAt(),
                voucher.getCreatedAt(),
                resolveUsedAt(voucher),
                getStatus(voucher),
                isValid,
                errorCode
        );
    }

    @Transactional
    public void consumeVoucher(String code, Integer receiptId) {
        Receipt receipt = null;
        if (receiptId != null) {
            receipt = receiptRepository.findById(receiptId)
                    .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        }
        consumeVoucher(code, receipt);
    }

    @Transactional
    public void consumeVoucher(String code, Receipt receipt) {
        if (code == null) throw new RuntimeException("ERROR.CODE_REQUIRED");
        code = code.trim().toUpperCase();

        CustomerVoucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("ERROR.CUSTOMER_VOUCHER.NOT_FOUND"));

        if (Boolean.TRUE.equals(voucher.getUsed())) {
            throw new RuntimeException("ERROR.CUSTOMER_VOUCHER.ALREADY_USED");
        }

        voucher.setUsed(true);
        voucher.setUsedReceipt(receipt);
        voucher.setUsedAt(receipt != null && receipt.getClosedAt() != null ? receipt.getClosedAt() : LocalDateTime.now());
        voucherRepository.save(voucher);
    }

    @Transactional
    public void cancelVoucherUsage(Integer receiptId) {
        voucherRepository.findByUsedReceiptId(receiptId).ifPresent(voucher -> {
            voucher.setUsed(false);
            voucher.setUsedReceipt(null);
            voucher.setUsedAt(null);
            voucherRepository.save(voucher);
        });
    }

    @Transactional
    public Optional<String> cancelIssuedVoucher(Integer receiptId) {
        List<CustomerVoucher> vouchers = voucherRepository.findAllByIssuedReceiptId(receiptId);
        if (vouchers.isEmpty()) return Optional.empty();
        vouchers.forEach(voucher -> {
            voucher.setUsed(true);
            voucher.setUsedAt(LocalDateTime.now());
            voucherRepository.save(voucher);
        });
        String codes = vouchers.stream().map(CustomerVoucher::getCode).collect(java.util.stream.Collectors.joining(", "));
        return Optional.of(codes);
    }

    @Transactional
    public void reactivateVoucherByCode(String code) {
        CustomerVoucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER.NOT_FOUND"));

        if (!voucher.getUsed()) {
            throw new RuntimeException("ERROR.VOUCHER.ALREADY_ACTIVE");
        }

        voucher.setUsed(false);
        voucher.setUsedReceipt(null);
        voucher.setUsedAt(null);
        voucherRepository.save(voucher);
    }

    // --- EMITERE AUTOMATĂ LA ÎNCHIDERE BON ---

    /**
     * Verifică campaniile eligibile și emite vouchere.
     * REGULAR: emite N vouchere (vouchersPerReceipt), returnează lista pentru print.
     * LOYALTY:  nu emite automat — returnează campania pentru dialog casier.
     * GIFT_CARD: niciodată auto-triggerat.
     * Dacă REGULAR și LOYALTY sunt ambele eligibile, REGULAR câștigă (valoare mai mare).
     */
    @Transactional
    public CustomerVoucherDTOs.VoucherIssuanceResult checkAndIssueVouchers(Receipt receipt) {
        List<VoucherCampaign> allActive = campaignRepository.findAllActive(LocalDate.now());

        List<VoucherCampaign> regularEligible = allActive.stream()
                .filter(c -> "REGULAR".equals(c.getCampaignType().getCode()))
                .filter(c -> isEligible(receipt, c))
                .collect(Collectors.toList());

        List<VoucherCampaign> loyaltyEligible = allActive.stream()
                .filter(c -> "LOYALTY".equals(c.getCampaignType().getCode()))
                .filter(c -> isEligible(receipt, c))
                .collect(Collectors.toList());

        // REGULAR câștigă față de LOYALTY dacă ambele se califică
        if (!regularEligible.isEmpty()) {
            VoucherCampaign best = regularEligible.stream()
                    .max(Comparator.comparing(c -> totalValue(c)))
                    .orElseThrow();

            List<CustomerVoucherDTOs.IssuedVoucherInfo> issued = new ArrayList<>();
            int count = best.getVouchersPerReceipt() != null ? best.getVouchersPerReceipt() : 1;
            for (int i = 0; i < count; i++) {
                issued.add(doIssueVoucher(receipt, best));
            }
            return new CustomerVoucherDTOs.VoucherIssuanceResult(issued, null);
        }

        if (!loyaltyEligible.isEmpty()) {
            VoucherCampaign best = loyaltyEligible.stream()
                    .max(Comparator.comparing(c -> c.getDiscountValue() != null ? c.getDiscountValue() : BigDecimal.ZERO))
                    .orElseThrow();
            return new CustomerVoucherDTOs.VoucherIssuanceResult(
                    Collections.emptyList(),
                    mapToLoyaltyInfo(best)
            );
        }

        return new CustomerVoucherDTOs.VoucherIssuanceResult(Collections.emptyList(), null);
    }

    /** Emite un voucher LOYALTY la alegerea casierului (după dialog). */
    @Transactional
    public CustomerVoucherDTOs.IssuedVoucherInfo issueLoyaltyVoucher(Integer campaignId, Integer receiptId) {
        VoucherCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND"));

        if (!"LOYALTY".equals(campaign.getCampaignType().getCode())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_LOYALTY");
        }

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        // Vizita curentă contează ca stampilă — înregistrată automat la emiterea voucherului
        StampLog stamp = StampLog.builder()
                .campaign(campaign)
                .cashier(receipt.getUser())
                .receipt(receipt)
                .build();
        stampLogRepository.save(stamp);

        return doIssueVoucher(receipt, campaign);
    }

    /** Înregistrează o ștampilă (fără emitere voucher). */
    @Transactional
    public void addStamp(Integer campaignId, Integer cashierId, Integer receiptId) {
        VoucherCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND"));

        if (!"LOYALTY".equals(campaign.getCampaignType().getCode())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_LOYALTY");
        }

        User cashier = cashierId != null
                ? userRepository.findById(cashierId).orElse(null)
                : null;

        Receipt receipt = receiptId != null
                ? receiptRepository.findById(receiptId).orElse(null)
                : null;

        StampLog stamp = StampLog.builder()
                .campaign(campaign)
                .cashier(cashier)
                .receipt(receipt)
                .build();
        stampLogRepository.save(stamp);
    }

    /** Statistici fidelitate per campanie LOYALTY (pentru tab admin). */
    @Transactional(readOnly = true)
    public CustomerVoucherDTOs.LoyaltyStats getLoyaltyStats(Integer campaignId) {
        VoucherCampaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND"));

        long vouchersIssued = voucherRepository.countByCampaignId(campaignId);
        long vouchersUsed = voucherRepository.countByCampaignIdAndUsedTrue(campaignId);
        long stampsGiven = stampLogRepository.countByCampaignId(campaignId);

        List<CustomerVoucherDTOs.StampLogEntry> stampHistory = stampLogRepository
                .findByCampaignIdOrderByGivenAtDesc(campaignId).stream()
                .map(s -> new CustomerVoucherDTOs.StampLogEntry(
                        s.getId(),
                        s.getCashier() != null ? s.getCashier().getFullName() : "Necunoscut",
                        s.getReceipt() != null ? s.getReceipt().getId() : null,
                        s.getGivenAt()))
                .collect(Collectors.toList());

        return new CustomerVoucherDTOs.LoyaltyStats(
                campaignId,
                campaign.getName(),
                campaign.getStampsRequired(),
                vouchersIssued,
                vouchersUsed,
                stampsGiven,
                stampHistory
        );
    }

    // --- GIFT CARD ---

    /**
     * Creează un voucher GIFT_CARD cu valoarea specificată manual de casier.
     * Bonul fiscal a fost deja creat de ReceiptService.registerGiftCardPayment.
     */
    @Transactional
    public CustomerVoucherDTOs.IssuedVoucherInfo issueGiftCardVoucher(BigDecimal amount, Receipt issuedReceipt) {
        VoucherCampaign campaign = campaignRepository.findActiveGiftCardCampaign()
                .orElseThrow(() -> new RuntimeException("ERROR.GIFT_CARD_CAMPAIGN.NOT_ACTIVE"));

        String code = generateUniqueCode(campaign.getPrefix(), campaign.getCodeLength());

        CustomerVoucher voucher = CustomerVoucher.builder()
                .code(code)
                .campaign(campaign)
                .discountType("FIXED")
                .discountValue(amount)
                .expiresAt(LocalDate.now().plusDays(campaign.getValidDays()).atTime(23, 59, 59))
                .issuedReceipt(issuedReceipt)
                .used(false)
                .build();

        CustomerVoucher saved = voucherRepository.save(voucher);
        return mapToIssuedInfo(saved);
    }

    // --- CALCUL VALOARE VOUCHER ---

    public BigDecimal calculateVoucherValue(CustomerVoucher voucher, Receipt receipt) {
        String type = voucher.getDiscountType();
        BigDecimal val = voucher.getDiscountValue();
        Integer targetProductId = voucher.getCampaign().getApplicableProductId();

        if ("FIXED".equals(type)) {
            if (targetProductId != null) {
                boolean hasProduct = receipt.getItems().stream()
                        .anyMatch(item -> item.getProduct().getId().equals(targetProductId));
                if (!hasProduct) return BigDecimal.ZERO;
            }
            return val.min(receipt.getTotalAmount());
        }

        if ("PERCENT".equals(type)) {
            BigDecimal baseAmount;
            if (targetProductId != null) {
                boolean hasProduct = receipt.getItems().stream()
                        .anyMatch(item -> item.getProduct().getId().equals(targetProductId));
                if (!hasProduct) return BigDecimal.ZERO;
                baseAmount = receipt.getItems().stream()
                        .filter(item -> item.getProduct().getId().equals(targetProductId))
                        .map(ReceiptItem::getLineTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            } else {
                baseAmount = receipt.getTotalAmount();
            }
            BigDecimal calculated = baseAmount.multiply(val)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            BigDecimal maxCap = voucher.getCampaign().getMaxDiscountAmount();
            if (maxCap != null && calculated.compareTo(maxCap) > 0) {
                calculated = maxCap;
            }
            return calculated.min(receipt.getTotalAmount());
        }

        if ("FREE_HOURS".equals(type) && targetProductId != null) {
            return receipt.getItems().stream()
                    .filter(item -> item.getProduct().getId().equals(targetProductId))
                    .findFirst()
                    .map(item -> {
                        BigDecimal itemQuantity = item.getQuantity() != null ? item.getQuantity() : val;
                        BigDecimal applicableHours = val.min(itemQuantity);
                        return item.getUnitPrice().multiply(applicableHours);
                    })
                    .orElse(BigDecimal.ZERO)
                    .min(receipt.getTotalAmount());
        }

        return BigDecimal.ZERO;
    }

    // --- PRIVATE HELPERS ---

    private CustomerVoucherDTOs.IssuedVoucherInfo doIssueVoucher(Receipt receipt, VoucherCampaign campaign) {
        String code = generateUniqueCode(campaign.getPrefix(), campaign.getCodeLength());

        CustomerVoucher voucher = CustomerVoucher.builder()
                .code(code)
                .campaign(campaign)
                .discountType(campaign.getDiscountType())
                .discountValue(campaign.getDiscountValue())
                .expiresAt(LocalDate.now().plusDays(campaign.getValidDays()).atTime(23, 59, 59))
                .issuedReceipt(receipt)
                .used(false)
                .build();

        CustomerVoucher saved = voucherRepository.save(voucher);
        return mapToIssuedInfo(saved);
    }

    private CustomerVoucherDTOs.IssuedVoucherInfo mapToIssuedInfo(CustomerVoucher v) {
        return new CustomerVoucherDTOs.IssuedVoucherInfo(
                v.getId(),
                v.getCode(),
                v.getCampaign().getName(),
                v.getCampaign().getCampaignType().getCode(),
                v.getDiscountType(),
                v.getDiscountValue(),
                v.getExpiresAt(),
                v.getCampaign().getValidDays(),
                v.getCampaign().getApplicableDays(),
                v.getCampaign().getStampsRequired(),
                v.getCampaign().getReceiptTemplate()
        );
    }

    private CustomerVoucherDTOs.LoyaltyCampaignInfo mapToLoyaltyInfo(VoucherCampaign c) {
        return new CustomerVoucherDTOs.LoyaltyCampaignInfo(
                c.getId(),
                c.getName(),
                c.getStampsRequired(),
                c.getDiscountType(),
                c.getDiscountValue()
        );
    }

    private BigDecimal totalValue(VoucherCampaign c) {
        BigDecimal val = c.getDiscountValue() != null ? c.getDiscountValue() : BigDecimal.ZERO;
        int count = c.getVouchersPerReceipt() != null ? c.getVouchersPerReceipt() : 1;
        return val.multiply(new BigDecimal(count));
    }

    private boolean isEligible(Receipt receipt, VoucherCampaign campaign) {
        if (campaign.getMinAmount() != null && receipt.getTotalAmount().compareTo(campaign.getMinAmount()) < 0) {
            return false;
        }
        if (campaign.getRequiredProductIds() != null && !campaign.getRequiredProductIds().isEmpty()) {
            boolean productPresent = receipt.getItems().stream()
                    .anyMatch(item -> item.getProduct() != null &&
                            campaign.getRequiredProductIds().contains(item.getProduct().getId()));
            if (!productPresent) return false;
        }
        if (campaign.getMinHoursPlayed() != null) {
            BigDecimal hoursPlayed = receipt.getItems().stream()
                    .filter(ReceiptItem::isServiceTime)
                    .map(ReceiptItem::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (hoursPlayed.compareTo(new BigDecimal(campaign.getMinHoursPlayed())) < 0) {
                return false;
            }
        }
        return true;
    }

    private String generateUniqueCode(String prefix, int length) {
        String safePrefix = (prefix != null && !prefix.isBlank()) ? prefix.toUpperCase() : "";
        String code;
        int attempts = 0;
        do {
            if (attempts++ > 100) {
                throw new RuntimeException("ERROR.VOUCHER.CODE_SPACE_EXHAUSTED");
            }
            StringBuilder sb = new StringBuilder(safePrefix);
            if (!safePrefix.isEmpty()) sb.append("-");
            for (int i = 0; i < length; i++) {
                sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
            }
            code = sb.toString();
        } while (voucherRepository.existsByCode(code));
        return code;
    }

    private boolean isDayValid(VoucherCampaign campaign) {
        if (campaign.getApplicableDays() == null || campaign.getApplicableDays().isBlank()) return true;
        String today = String.valueOf(LocalDate.now().getDayOfWeek().getValue());
        return campaign.getApplicableDays().contains(today);
    }

    private CustomerVoucherDTOs.SummaryResponse mapToSummary(CustomerVoucher v) {
        return new CustomerVoucherDTOs.SummaryResponse(
                v.getId(),
                v.getCode(),
                v.getCampaign().getName(),
                v.getCampaign().getCampaignType().getCode(),
                v.getDiscountType(),
                v.getDiscountValue(),
                v.getExpiresAt(),
                getStatus(v),
                v.getUsed(),
                v.getCreatedAt(),
                resolveUsedAt(v),
                v.getIssuedReceipt() != null ? v.getIssuedReceipt().getId() : null,
                v.getUsedReceipt() != null ? v.getUsedReceipt().getId() : null,
                v.getCampaign().getStampsRequired(),
                v.getCampaign().getReceiptTemplate()
        );
    }

    private LocalDateTime resolveUsedAt(CustomerVoucher voucher) {
        if (voucher.getUsedAt() != null) return voucher.getUsedAt();
        if (voucher.getUsedReceipt() != null) return voucher.getUsedReceipt().getClosedAt();
        return null;
    }

    private String getStatus(CustomerVoucher voucher) {
        if (Boolean.TRUE.equals(voucher.getUsed())) return "USED";
        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(LocalDateTime.now())) return "EXPIRED";
        return "AVAILABLE";
    }
}

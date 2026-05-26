package com.sellbit.domain.voucher.vouchercampaign;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import com.sellbit.domain.catalog.product.ProductRepository;

import jakarta.validation.Valid;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Validated
public class VoucherCampaignService {

    private final VoucherCampaignRepository repository;
    private final ProductRepository productRepository;
    private final CampaignTypeRepository campaignTypeRepository;

    @Transactional(readOnly = true)
    public List<String> getActivePrefixes(LocalDate today) {
        return repository.findActivePrefixes(today);
    }

    @Transactional(readOnly = true)
    public VoucherCampaignDTOs.ActiveGiftCardResponse getActiveGiftCardStatus() {
        return repository.findActiveGiftCardCampaign()
                .map(c -> new VoucherCampaignDTOs.ActiveGiftCardResponse(true, c.getId()))
                .orElse(new VoucherCampaignDTOs.ActiveGiftCardResponse(false, null));
    }

    @Transactional
    public VoucherCampaignDTOs.Response create(@Valid VoucherCampaignDTOs.Request request) {
        validateDates(request);
        validateProducts(request);
        validateDiscount(request);

        CampaignType campaignType = campaignTypeRepository.findByCode(
                request.campaignType() != null ? request.campaignType() : "REGULAR")
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.INVALID_TYPE"));

        String finalPrefix = request.prefix() != null ? request.prefix() : "JOACA-";
        if (repository.existsByPrefixAndActiveTrue(finalPrefix)) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.PREFIX_ALREADY_ACTIVE");
        }

        VoucherCampaign campaign = VoucherCampaign.builder()
                .name(request.name())
                .validFromDate(request.validFromDate())
                .validUntilDate(request.validUntilDate())
                .discountType(request.discountType())
                .discountValue(request.discountValue())
                .maxDiscountAmount(request.maxDiscountAmount())
                .minAmount(request.minAmount())
                .minHoursPlayed(request.minHoursPlayed())
                .requiredProductIds(request.requiredProductIds())
                .applicableProductId(request.applicableProductId())
                .validDays(request.validDays() != null ? request.validDays() : 30)
                .applicableDays(request.applicableDays())
                .prefix(finalPrefix)
                .codeLength(request.codeLength() != null ? request.codeLength() : 4)
                .receiptTemplate(request.receiptTemplate())
                .campaignType(campaignType)
                .vouchersPerReceipt(request.vouchersPerReceipt() != null ? request.vouchersPerReceipt() : 1)
                .stampsRequired(request.stampsRequired())
                .active(true)
                .build();

        return mapToResponse(repository.save(campaign));
    }

    @Transactional
    public VoucherCampaignDTOs.Response update(Integer id, @Valid VoucherCampaignDTOs.Request request) {
        validateDates(request);

        VoucherCampaign campaign = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND"));

        validateProducts(request);
        validateDiscount(request);

        CampaignType campaignType = campaignTypeRepository.findByCode(
                request.campaignType() != null ? request.campaignType() : "REGULAR")
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.INVALID_TYPE"));

        String finalPrefix = request.prefix() != null ? request.prefix() : "JOACA-";
        if (campaign.getActive() && repository.existsByPrefixAndActiveTrueAndIdNot(finalPrefix, campaign.getId())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.PREFIX_ALREADY_ACTIVE");
        }

        campaign.setName(request.name());
        campaign.setValidFromDate(request.validFromDate());
        campaign.setValidUntilDate(request.validUntilDate());
        campaign.setDiscountType(request.discountType());
        campaign.setDiscountValue(request.discountValue());
        campaign.setMaxDiscountAmount(request.maxDiscountAmount());
        campaign.setMinAmount(request.minAmount());
        campaign.setMinHoursPlayed(request.minHoursPlayed());
        campaign.setRequiredProductIds(request.requiredProductIds());
        campaign.setApplicableProductId(request.applicableProductId());
        campaign.setValidDays(request.validDays() != null ? request.validDays() : 30);
        campaign.setApplicableDays(request.applicableDays());
        campaign.setPrefix(finalPrefix);
        campaign.setCodeLength(request.codeLength() != null ? request.codeLength() : 4);
        campaign.setReceiptTemplate(request.receiptTemplate());
        campaign.setCampaignType(campaignType);
        campaign.setVouchersPerReceipt(request.vouchersPerReceipt() != null ? request.vouchersPerReceipt() : 1);
        campaign.setStampsRequired(request.stampsRequired());

        return mapToResponse(repository.save(campaign));
    }

    @Transactional
    public List<VoucherCampaignDTOs.Response> getAll() {
        return repository.findAll().stream()
                .peek(campaign -> {
                    if (campaign.getActive() && campaign.getValidUntilDate() != null
                            && campaign.getValidUntilDate().isBefore(LocalDate.now())) {
                        campaign.setActive(false);
                        repository.save(campaign);
                    }
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VoucherCampaignDTOs.Response> getActiveCampaigns() {
        return repository.findAllByActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VoucherCampaignDTOs.Response> getInactiveCampaigns() {
        return repository.findAllByActiveFalse().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public VoucherCampaignDTOs.Response toggleStatus(Integer id) {
        VoucherCampaign campaign = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND"));
        campaign.setActive(!campaign.getActive());
        return mapToResponse(repository.save(campaign));
    }

    // --- HELPERS ---

    private void validateDates(VoucherCampaignDTOs.Request request) {
        if (request.validUntilDate().isBefore(request.validFromDate())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE");
        }
    }

    private void validateProducts(VoucherCampaignDTOs.Request request) {
        if (request.requiredProductIds() != null) {
            for (Integer id : request.requiredProductIds()) {
                if (!productRepository.existsById(id)) {
                    throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.REQUIRED_PRODUCT_NOT_FOUND");
                }
            }
        }
        if (request.applicableProductId() != null && !productRepository.existsById(request.applicableProductId())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.APPLICABLE_PRODUCT_NOT_FOUND");
        }
    }

    private void validateDiscount(VoucherCampaignDTOs.Request request) {
        boolean isGiftCard = "GIFT_CARD".equals(request.campaignType());
        if (isGiftCard) return; // valoarea vine din bon la runtime

        if (request.discountValue() == null || request.discountValue().signum() == 0) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.DISCOUNT_VALUE_REQUIRED");
        }
        if (request.discountValue().signum() < 0) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NEGATIVE_DISCOUNT");
        }
        if ("PERCENT".equals(request.discountType())) {
            if (request.discountValue().compareTo(new java.math.BigDecimal("100")) > 0) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.PERCENT_OVER_100");
            }
            if (request.maxDiscountAmount() == null || request.maxDiscountAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_REQUIRED");
            }
        }
    }

    VoucherCampaignDTOs.Response mapToResponse(VoucherCampaign c) {
        return new VoucherCampaignDTOs.Response(
                c.getId(),
                c.getName(),
                c.getValidFromDate(),
                c.getValidUntilDate(),
                c.getActive(),
                c.getDiscountType(),
                c.getDiscountValue(),
                c.getMaxDiscountAmount(),
                c.getMinAmount(),
                c.getMinHoursPlayed(),
                c.getApplicableDays(),
                c.getRequiredProductIds(),
                c.getApplicableProductId(),
                getProductNames(c.getRequiredProductIds()),
                getProductName(c.getApplicableProductId()),
                c.getValidDays(),
                c.getPrefix(),
                c.getCodeLength(),
                c.getReceiptTemplate(),
                c.getCampaignType() != null ? c.getCampaignType().getCode() : "REGULAR",
                c.getCampaignType() != null ? c.getCampaignType().getLabel() : "Campanie Regulată",
                c.getVouchersPerReceipt(),
                c.getStampsRequired()
        );
    }

    private String getProductName(Integer productId) {
        if (productId == null) return null;
        return productRepository.findById(productId).map(p -> p.getName()).orElse(null);
    }

    private List<String> getProductNames(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) return null;
        return productIds.stream()
                .map(this::getProductName)
                .collect(Collectors.toList());
    }
}

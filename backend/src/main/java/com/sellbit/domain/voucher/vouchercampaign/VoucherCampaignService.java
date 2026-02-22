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

    @Transactional(readOnly = true)
    public List<String> getActivePrefixes(LocalDate today) {
        return repository.findActivePrefixes(today);
    }

    @Transactional
    public VoucherCampaignDTOs.Response create(@Valid VoucherCampaignDTOs.Request request) {
        if (request.validUntilDate().isBefore(request.validFromDate())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE");
        }

        if (request.requiredProductId() != null) {
            boolean exists = productRepository.existsById(request.requiredProductId());
            if (!exists) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.REQUIRED_PRODUCT_NOT_FOUND");
            }
        }

        if (request.applicableProductId() != null) {
            boolean exists = productRepository.existsById(request.applicableProductId());
            if (!exists) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.APPLICABLE_PRODUCT_NOT_FOUND");
            }
        }

        if (request.discountValue() != null && request.discountValue().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NEGATIVE_DISCOUNT");
        }

        if ("PERCENT".equals(request.discountType()) && request.discountValue() != null) {
            if (request.discountValue().compareTo(new java.math.BigDecimal("100")) > 0) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.PERCENT_OVER_100");
            }
            // Pentru discount PERCENT, maxDiscountAmount este obligatoriu
            if (request.maxDiscountAmount() == null) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_REQUIRED");
            }
            if (request.maxDiscountAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_POSITIVE");
            }
        }

        String finalPrefix = request.prefix() != null ? request.prefix() : "JOACA-";

        // Verificăm dacă e deja folosit de o campanie activă
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
                .requiredProductId(request.requiredProductId())
                .applicableProductId(request.applicableProductId())
                .validDays(request.validDays() != null ? request.validDays() : 30)
                .applicableDays(request.applicableDays())
                .prefix(request.prefix() != null ? request.prefix() : "JOACA-")
                .codeLength(request.codeLength() != null ? request.codeLength() : 4)
                .receiptTemplate(request.receiptTemplate())
                .active(true)
                .build();

        VoucherCampaign saved = repository.save(campaign);
        return mapToResponse(saved);
    }

    @Transactional
    public VoucherCampaignDTOs.Response update(Integer id, @Valid VoucherCampaignDTOs.Request request) {
        if (request.validUntilDate().isBefore(request.validFromDate())) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE");
        }

        VoucherCampaign campaign = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND"));

        if (request.requiredProductId() != null) {
            boolean exists = productRepository.existsById(request.requiredProductId());
            if (!exists) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.REQUIRED_PRODUCT_NOT_FOUND");
            }
        }

        if (request.applicableProductId() != null) {
            boolean exists = productRepository.existsById(request.applicableProductId());
            if (!exists) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.APPLICABLE_PRODUCT_NOT_FOUND");
            }
        }

        if (request.discountValue() != null && request.discountValue().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.NEGATIVE_DISCOUNT");
        }

        if ("PERCENT".equals(request.discountType()) && request.discountValue() != null) {
            if (request.discountValue().compareTo(new java.math.BigDecimal("100")) > 0) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.PERCENT_OVER_100");
            }
            // Pentru discount PERCENT, maxDiscountAmount este obligatoriu
            if (request.maxDiscountAmount() == null) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_REQUIRED");
            }
            if (request.maxDiscountAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_POSITIVE");
            }
        }

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
        campaign.setRequiredProductId(request.requiredProductId());
        campaign.setApplicableProductId(request.applicableProductId());
        campaign.setValidDays(request.validDays() != null ? request.validDays() : 30);
        campaign.setApplicableDays(request.applicableDays());
        campaign.setPrefix(finalPrefix);
        campaign.setCodeLength(request.codeLength() != null ? request.codeLength() : 4);
        campaign.setReceiptTemplate(request.receiptTemplate());
        
        // Reactivare automat daca campaign era inactiv dar acum are date valide
        if (!campaign.getActive() && request.validUntilDate().isAfter(LocalDate.now())) {
            campaign.setActive(true);
        }

        VoucherCampaign updated = repository.save(campaign);
        return mapToResponse(updated);
    }

    @Transactional
    public List<VoucherCampaignDTOs.Response> getAll() {
        return repository.findAll().stream()
                .peek(campaign -> {
                    // Dezactivare automata daca campania a expirat
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
        VoucherCampaign updated = repository.save(campaign);
        return mapToResponse(updated);
    }

    private VoucherCampaignDTOs.Response mapToResponse(VoucherCampaign c) {
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
                c.getRequiredProductId(),
                c.getApplicableProductId(),
                getProductName(c.getRequiredProductId()),
                getProductName(c.getApplicableProductId()),
                c.getValidDays(),
                c.getPrefix(),
                c.getCodeLength(),
                c.getReceiptTemplate());
    }

    private String getProductName(Integer productId) {
        if (productId == null) {
            return null;
        }
        return productRepository.findById(productId)
                .map(p -> p.getName())
                .orElse(null);
    }
}
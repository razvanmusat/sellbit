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

    @Transactional(readOnly = true)
    public List<VoucherCampaignDTOs.Response> getAll() {
        return repository.findAll().stream()
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
                c.getApplicableDays(),
                c.getRequiredProductId(),
                c.getApplicableProductId());
    }
}
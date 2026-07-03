package com.sellbit.domain.voucher.vouchercampaign;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CampaignTypeRepository extends JpaRepository<CampaignType, Integer> {
    Optional<CampaignType> findByCode(String code);
}

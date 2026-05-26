package com.sellbit.domain.voucher.vouchercampaign;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CampaignTypeRepository extends JpaRepository<CampaignType, Integer> {
    Optional<CampaignType> findByCode(String code);
}

package com.sellbit.domain.voucher.stamplog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StampLogRepository extends JpaRepository<StampLog, Integer> {

    long countByCampaignId(Integer campaignId);

    @Query("SELECT s FROM StampLog s WHERE s.campaign.id = :campaignId ORDER BY s.givenAt DESC")
    List<StampLog> findByCampaignIdOrderByGivenAtDesc(@Param("campaignId") Integer campaignId);
}

package com.sellbit.domain.voucher.stamplog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface StampLogRepository extends JpaRepository<StampLog, Integer> {

    long countByCampaignId(Integer campaignId);

    boolean existsByReceiptId(Integer receiptId);

    @Query("SELECT s FROM StampLog s WHERE s.campaign.id = :campaignId ORDER BY s.givenAt DESC")
    List<StampLog> findByCampaignIdOrderByGivenAtDesc(@Param("campaignId") Integer campaignId);

    @Query("SELECT COUNT(s) FROM StampLog s WHERE s.campaign.id = :campaignId AND CAST(s.givenAt AS date) >= :fromDate AND CAST(s.givenAt AS date) <= :toDate")
    long countByCampaignIdAndGivenAtBetween(@Param("campaignId") Integer campaignId, @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("SELECT s FROM StampLog s WHERE s.campaign.id = :campaignId AND CAST(s.givenAt AS date) >= :fromDate AND CAST(s.givenAt AS date) <= :toDate ORDER BY s.givenAt DESC")
    List<StampLog> findByCampaignIdAndGivenAtBetweenOrderByGivenAtDesc(@Param("campaignId") Integer campaignId, @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);
}

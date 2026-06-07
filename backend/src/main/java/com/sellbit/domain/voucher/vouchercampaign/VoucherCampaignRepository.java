package com.sellbit.domain.voucher.vouchercampaign;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VoucherCampaignRepository extends JpaRepository<VoucherCampaign, Integer> {

    // Pentru logica de business (emitere)
    @Query("SELECT v FROM VoucherCampaign v WHERE v.active = true AND :today BETWEEN v.validFromDate AND v.validUntilDate")
    List<VoucherCampaign> findAllActive(LocalDate today);

    // Pentru Admin UI (filtrare stare)
    List<VoucherCampaign> findAllByActiveTrue();

    List<VoucherCampaign> findAllByActiveFalse();

    @Query("SELECT DISTINCT vc.prefix FROM VoucherCampaign vc " +
            "WHERE vc.active = true " +
            "AND vc.validFromDate <= :today " +
            "AND vc.validUntilDate >= :today " +
            "AND vc.prefix IS NOT NULL")
    List<String> findActivePrefixes(@Param("today") java.time.LocalDate today);

    @Query("SELECT DISTINCT vc.prefix FROM VoucherCampaign vc WHERE vc.prefix IS NOT NULL")
    List<String> findAllPrefixes();

    boolean existsByPrefixAndActiveTrue(String prefix);

    boolean existsByPrefixAndActiveTrueAndIdNot(String prefix, Integer id);

    @Query("SELECT v FROM VoucherCampaign v WHERE v.active = true AND :today BETWEEN v.validFromDate AND v.validUntilDate AND v.campaignType.code = :typeCode")
    List<VoucherCampaign> findAllActiveByTypeCode(@Param("typeCode") String typeCode, @Param("today") java.time.LocalDate today);

    @Query("SELECT v FROM VoucherCampaign v WHERE v.active = true AND v.campaignType.code = 'GIFT_CARD'")
    java.util.Optional<VoucherCampaign> findActiveGiftCardCampaign();
}
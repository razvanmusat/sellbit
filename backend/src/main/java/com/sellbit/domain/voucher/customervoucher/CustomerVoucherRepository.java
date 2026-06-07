package com.sellbit.domain.voucher.customervoucher;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerVoucherRepository extends JpaRepository<CustomerVoucher, Integer> {

    Optional<CustomerVoucher> findByCode(String code);

    boolean existsByCode(String code);

    Optional<CustomerVoucher> findByUsedReceiptId(Integer receiptId);

    boolean existsByIssuedReceiptId(Integer receiptId);

    Optional<CustomerVoucher> findByIssuedReceiptId(Integer receiptId);

    // Toate voucherele emise de un bon (REGULAR poate emite N)
    List<CustomerVoucher> findAllByIssuedReceiptId(Integer receiptId);

    // Count vouchere emise de o campanie (pentru loyalty stats)
    long countByCampaignId(Integer campaignId);

    // Exclude voucherele anulate (used=true dar fara used_receipt — anulate la refund)
    @Query("SELECT COUNT(v) FROM CustomerVoucher v WHERE v.campaign.id = :campaignId AND v.used = true AND v.usedReceipt IS NOT NULL")
    long countByCampaignIdAndUsedTrueAndNotAnnulled(Integer campaignId);

    List<CustomerVoucher> findAllByUsedTrueOrderByUsedAtDesc();

    List<CustomerVoucher> findAllByUsedFalse();

    // Vouchere consumate legitim (au bon asociat)
    @Query("SELECT v FROM CustomerVoucher v LEFT JOIN FETCH v.campaign LEFT JOIN FETCH v.issuedReceipt LEFT JOIN FETCH v.usedReceipt WHERE v.used = true AND v.usedReceipt IS NOT NULL ORDER BY v.usedAt DESC")
    List<CustomerVoucher> findAllConsumedOrderByUsedAtDesc();

    // Vouchere anulate (used=true dar fara bon de utilizare — anulate la refund)
    @Query("SELECT v FROM CustomerVoucher v LEFT JOIN FETCH v.campaign LEFT JOIN FETCH v.issuedReceipt WHERE v.used = true AND v.usedReceipt IS NULL ORDER BY v.usedAt DESC")
    List<CustomerVoucher> findAllAnnulledOrderByUsedAtDesc();

    @Query("SELECT v FROM CustomerVoucher v WHERE v.used = false AND v.expiresAt > :now")
    List<CustomerVoucher> findAvailable(LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v WHERE v.used = false AND v.expiresAt <= :now")
    List<CustomerVoucher> findExpired(LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v " +
           "LEFT JOIN FETCH v.campaign " +
           "LEFT JOIN FETCH v.issuedReceipt " +
           "WHERE v.used = false AND v.expiresAt <= :now " +
           "AND CAST(v.expiresAt AS date) >= :fromDate AND CAST(v.expiresAt AS date) <= :toDate " +
           "ORDER BY v.expiresAt DESC")
    List<CustomerVoucher> findExpiredBetween(LocalDate fromDate, LocalDate toDate, LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v " +
           "LEFT JOIN FETCH v.campaign " +
           "LEFT JOIN FETCH v.issuedReceipt " +
           "LEFT JOIN FETCH v.usedReceipt " +
           "WHERE v.used = false AND v.expiresAt > :now " +
           "AND CAST(v.createdAt AS date) >= :fromDate AND CAST(v.createdAt AS date) <= :toDate " +
           "ORDER BY v.createdAt DESC")
    List<CustomerVoucher> findAvailableBetween(LocalDate fromDate, LocalDate toDate, LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v " +
           "LEFT JOIN FETCH v.campaign " +
           "LEFT JOIN FETCH v.issuedReceipt " +
           "LEFT JOIN FETCH v.usedReceipt " +
           "WHERE v.used = true AND v.usedReceipt IS NOT NULL " +
           "AND v.usedAt IS NOT NULL " +
           "AND CAST(v.usedAt AS date) >= :fromDate AND CAST(v.usedAt AS date) <= :toDate " +
           "ORDER BY v.usedAt DESC")
    List<CustomerVoucher> findUsedBetween(LocalDate fromDate, LocalDate toDate);

    @Query("SELECT v FROM CustomerVoucher v " +
           "LEFT JOIN FETCH v.campaign " +
           "LEFT JOIN FETCH v.issuedReceipt " +
           "WHERE v.used = true AND v.usedReceipt IS NULL " +
           "AND v.usedAt IS NOT NULL " +
           "AND CAST(v.usedAt AS date) >= :fromDate AND CAST(v.usedAt AS date) <= :toDate " +
           "ORDER BY v.usedAt DESC")
    List<CustomerVoucher> findAnnulledBetween(LocalDate fromDate, LocalDate toDate);

    // Loyalty stats cu filtrare pe perioadă
    @Query("SELECT COUNT(v) FROM CustomerVoucher v WHERE v.campaign.id = :campaignId AND CAST(v.createdAt AS date) >= :fromDate AND CAST(v.createdAt AS date) <= :toDate")
    long countByCampaignIdAndCreatedBetween(Integer campaignId, LocalDate fromDate, LocalDate toDate);

    @Query("SELECT COUNT(v) FROM CustomerVoucher v WHERE v.campaign.id = :campaignId AND v.used = true AND v.usedReceipt IS NOT NULL AND v.usedAt IS NOT NULL AND CAST(v.usedAt AS date) >= :fromDate AND CAST(v.usedAt AS date) <= :toDate")
    long countByCampaignIdAndUsedTrueAndNotAnnulledBetween(Integer campaignId, LocalDate fromDate, LocalDate toDate);
}
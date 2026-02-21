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
    
    Optional<CustomerVoucher> findByIssuedReceiptId(Integer receiptId);

    List<CustomerVoucher> findAllByUsedTrue();

    List<CustomerVoucher> findAllByUsedFalse();

    @Query("SELECT v FROM CustomerVoucher v WHERE v.used = false AND v.expiresAt > :now")
    List<CustomerVoucher> findAvailable(LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v WHERE v.used = false AND v.expiresAt <= :now")
    List<CustomerVoucher> findExpired(LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v WHERE v.used = false AND v.expiresAt > :now " +
           "AND CAST(v.createdAt AS date) >= :fromDate AND CAST(v.createdAt AS date) <= :toDate " +
           "ORDER BY v.createdAt DESC")
    List<CustomerVoucher> findAvailableBetween(LocalDate fromDate, LocalDate toDate, LocalDateTime now);

    @Query("SELECT v FROM CustomerVoucher v WHERE v.used = true " +
           "AND CAST(v.createdAt AS date) >= :fromDate AND CAST(v.createdAt AS date) <= :toDate " +
           "ORDER BY v.createdAt DESC")
    List<CustomerVoucher> findUsedBetween(LocalDate fromDate, LocalDate toDate);
}
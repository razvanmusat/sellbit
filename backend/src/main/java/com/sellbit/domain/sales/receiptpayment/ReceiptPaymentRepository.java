package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ReceiptPaymentRepository extends JpaRepository<ReceiptPayment, Integer> {
    List<ReceiptPayment> findByReceiptId(Integer receiptId);
    
    @Query("SELECT COALESCE(SUM(rp.amount), 0) FROM ReceiptPayment rp " +
    	       "WHERE rp.paymentMethod.code = 'VOUCHER' " +
    	       "AND rp.receipt.status.code = 'CLOSED' " +
    	       "AND rp.receipt.closedAt BETWEEN :start AND :end")
    	BigDecimal getTotalVoucherDiscounts(LocalDateTime start, LocalDateTime end);
}
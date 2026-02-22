package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReceiptPaymentRepository extends JpaRepository<ReceiptPayment, Integer> {
	List<ReceiptPayment> findByReceiptId(Integer receiptId);

	@Query("SELECT COALESCE(SUM(rp.amount * (rp.receipt.totalNet / rp.receipt.totalAmount)), 0) FROM ReceiptPayment rp " +
			"WHERE rp.paymentMethod.code = 'VOUCHER' " +
			"AND rp.receipt.status.code = 'CLOSED' " +
			"AND rp.receipt.closedAt BETWEEN :start AND :end " +
			"AND (:warehouseId IS NULL OR rp.receipt.warehouse.id = :warehouseId)")
	BigDecimal getTotalVoucherDiscounts(
			@Param("start") LocalDateTime start,
			@Param("end") LocalDateTime end,
			@Param("warehouseId") Integer warehouseId);

	@Query("SELECT COALESCE(SUM(rp.amount), 0) " +
			"FROM ReceiptPayment rp " +
			"WHERE rp.receipt.status.code = 'CLOSED' " +
			"AND rp.receipt.closedAt BETWEEN :start AND :end " +
			"AND (:warehouseId IS NULL OR rp.receipt.warehouse.id = :warehouseId) " +
			"AND (:methodCode IS NULL OR rp.paymentMethod.code = :methodCode) " +
			"AND rp.paymentMethod.code != 'ADVANCE'")
	BigDecimal calculatePaymentsSum(
			@Param("start") LocalDateTime start,
			@Param("end") LocalDateTime end,
			@Param("methodCode") String methodCode,
			@Param("warehouseId") Integer warehouseId);
}
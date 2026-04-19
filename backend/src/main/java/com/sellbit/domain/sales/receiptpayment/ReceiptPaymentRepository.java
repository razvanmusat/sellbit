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

        /**
         * Suma discount-urilor prin vouchere per gestiune.
         * Acum că voucherul are warehouseId explicit, filtrăm direct după el.
         * Dacă warehouseId = null → toate gestiunile.
         */
        @Query("SELECT COALESCE(SUM(rp.amount), 0) " +
                        "FROM ReceiptPayment rp " +
                        "WHERE rp.paymentMethod.code = 'VOUCHER' " +
                        "AND rp.receipt.status.code = 'CLOSED' " +
                        "AND rp.receipt.internalCorrection = false " +
                        "AND rp.receipt.closedAt BETWEEN :start AND :end " +
                        "AND (:warehouseId IS NULL OR rp.warehouse.id = :warehouseId)")
        BigDecimal getTotalVoucherDiscounts(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("warehouseId") Integer warehouseId);

        /**
         * Suma încasărilor per metodă de plată, filtrate direct după warehouseId al plății.
         * Dacă warehouseId = null → toate gestiunile.
         * VOUCHER și ADVANCE excluse — tratate separat.
         */
        @Query("SELECT COALESCE(SUM(rp.amount), 0) " +
                        "FROM ReceiptPayment rp " +
                        "WHERE rp.receipt.status.code = 'CLOSED' " +
                        "AND rp.receipt.internalCorrection = false " +
                        "AND rp.receipt.closedAt BETWEEN :start AND :end " +
                        "AND (:warehouseId IS NULL OR rp.warehouse.id = :warehouseId) " +
                        "AND (:methodCode IS NULL OR rp.paymentMethod.code = :methodCode) " +
                        "AND rp.paymentMethod.code != 'ADVANCE' " +
                        "AND rp.paymentMethod.code != 'VOUCHER'")
        BigDecimal calculatePaymentsSum(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("methodCode") String methodCode,
                        @Param("warehouseId") Integer warehouseId);
}
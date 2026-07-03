package com.sellbit.domain.sales.receipt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReceiptRepository extends JpaRepository<Receipt, Integer> {

        List<Receipt> findByStatus_Code(String statusCode);

        List<Receipt> findByStatus_CodeIn(java.util.List<String> statusCodes);

        @Query("""
                SELECT DISTINCT r FROM Receipt r
                JOIN r.items i
                WHERE (:warehouseId IS NULL OR i.warehouse.id = :warehouseId)
                AND r.status.code = :statusCode
                AND r.closedAt BETWEEN :start AND :end
                AND r.internalCorrection = false
                ORDER BY r.closedAt ASC
                """)
        List<Receipt> findByItemWarehouseAndStatusAndClosedAt(
                        @Param("warehouseId") Integer warehouseId,
                        @Param("statusCode") String statusCode,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("""
                SELECT new com.sellbit.domain.sales.receipt.ReceiptDTOs$SummaryResponse(
                    r.id, s.label, r.tableName, r.totalAmount,
                    (SELECT i2.warehouse.name FROM ReceiptItem i2 WHERE i2.receipt = r ORDER BY i2.id ASC LIMIT 1),
                    (SELECT i2.warehouse.id   FROM ReceiptItem i2 WHERE i2.receipt = r ORDER BY i2.id ASC LIMIT 1),
                    COALESCE(u.fullName, 'N/A'),
                    r.createdAt, r.closedAt, o.id)
                FROM Receipt r
                JOIN r.status s
                LEFT JOIN r.user u
                LEFT JOIN r.originalReceipt o
                WHERE (:warehouseId IS NULL OR EXISTS (
                    SELECT 1 FROM ReceiptItem i
                    WHERE i.receipt = r AND i.warehouse.id = :warehouseId
                ))
                AND s.code = :statusCode
                AND r.closedAt BETWEEN :start AND :end
                AND r.internalCorrection = false
                ORDER BY r.closedAt ASC
                """)
        List<ReceiptDTOs.SummaryResponse> findSummaryByWarehouseIdAndStatusCodeAndClosedAtBetween(
                        @Param("warehouseId") Integer warehouseId,
                        @Param("statusCode") String statusCode,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("""
                SELECT DISTINCT r FROM Receipt r
                JOIN r.items i
                WHERE (:warehouseId IS NULL OR i.warehouse.id = :warehouseId)
                AND r.closedAt BETWEEN :start AND :end
                AND r.internalCorrection = false
                """)
        List<Receipt> findByItemWarehouseAndClosedAtBetween(
                        @Param("warehouseId") Integer warehouseId,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT r FROM Receipt r WHERE r.originalReceipt.id = :originalId AND r.status.code = :statusCode")
        List<Receipt> findRefundsForReceipt(
                        @Param("originalId") Integer originalId,
                        @Param("statusCode") String statusCode);

        @Query("""
                SELECT r FROM Receipt r
                LEFT JOIN FETCH r.items i
                LEFT JOIN FETCH i.product p
                LEFT JOIN FETCH p.vatRate
                LEFT JOIN FETCH i.warehouse
                WHERE r.id = :id
                """)
        java.util.Optional<Receipt> findByIdWithItems(@Param("id") Integer id);

        @Query("""
                SELECT r FROM Receipt r
                LEFT JOIN FETCH r.payments pay
                LEFT JOIN FETCH pay.paymentMethod
                LEFT JOIN FETCH pay.warehouse
                WHERE r.id = :id
                """)
        java.util.Optional<Receipt> findByIdWithPayments(@Param("id") Integer id);
}
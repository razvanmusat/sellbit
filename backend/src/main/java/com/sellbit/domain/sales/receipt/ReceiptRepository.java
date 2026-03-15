package com.sellbit.domain.sales.receipt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Integer> {

        // Folosit pentru bonuri OPEN (alerte, active) — fără filtru pe gestiune.
        List<Receipt> findByStatus_Code(String statusCode);

        /**
         * RAPORTARE: Bonuri care conțin cel puțin o linie pe gestiunea dată.
         * Înlocuiește findByWarehouseIdAndStatus_CodeAndClosedAtBetween.
         * DISTINCT previne duplicatele când un bon are mai multe linii pe aceeași gestiune.
         */
        @Query("""
                SELECT DISTINCT r FROM Receipt r
                JOIN r.items i
                WHERE i.warehouse.id = :warehouseId
                AND r.status.code = :statusCode
                AND r.closedAt BETWEEN :start AND :end
                ORDER BY r.closedAt ASC
                """)
        List<Receipt> findByItemWarehouseAndStatusAndClosedAt(
                        @Param("warehouseId") Integer warehouseId,
                        @Param("statusCode") String statusCode,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        /**
         * RAPORTARE SUMMARY: Proiecție directă în DTO — filtrată după gestiunea liniilor.
         * warehouse-ul afișat în summary e cel al primei linii (prin subquery).
         */
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
                WHERE EXISTS (
                    SELECT 1 FROM ReceiptItem i
                    WHERE i.receipt = r AND i.warehouse.id = :warehouseId
                )
                AND s.code = :statusCode
                AND r.closedAt BETWEEN :start AND :end
                ORDER BY r.closedAt ASC
                """)
        List<ReceiptDTOs.SummaryResponse> findSummaryByWarehouseIdAndStatusCodeAndClosedAtBetween(
                        @Param("warehouseId") Integer warehouseId,
                        @Param("statusCode") String statusCode,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        /**
         * JURNAL TOTAL (Audit): Bonuri închise/anulate într-un interval,
         * filtrate după gestiunea liniilor.
         */
        @Query("""
                SELECT DISTINCT r FROM Receipt r
                JOIN r.items i
                WHERE i.warehouse.id = :warehouseId
                AND r.closedAt BETWEEN :start AND :end
                """)
        List<Receipt> findByItemWarehouseAndClosedAtBetween(
                        @Param("warehouseId") Integer warehouseId,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT r FROM Receipt r WHERE r.originalReceipt.id = :originalId AND r.status.code = :statusCode")
        List<Receipt> findRefundsForReceipt(
                        @Param("originalId") Integer originalId,
                        @Param("statusCode") String statusCode);
}
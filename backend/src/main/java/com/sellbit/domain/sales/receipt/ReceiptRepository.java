package com.sellbit.domain.sales.receipt;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReceiptRepository extends JpaRepository<Receipt, Integer> {

        List<Receipt> findByStatus_Code(String statusCode);

        /**
         * OPERAȚIONAL (LIVE UI):
         * Când dai click pe Tab "Gestiune 1", React va apela:
         * findByWarehouseIdAndStatus_Code(1, "OPEN")
         */
        @Query("SELECT r FROM Receipt r WHERE r.warehouse.id = :warehouseId AND r.status.code = :statusCode ORDER BY r.createdAt ASC")
        List<Receipt> findByWarehouseIdAndStatus_Code(@Param("warehouseId") Integer warehouseId,
                        @Param("statusCode") String statusCode);

        /**
         * RAPORTARE (HISTORY):
         * Când vrei să vezi ce s-a vândut pe Gestiunea 1 ieri:
         * findByWarehouseIdAndStatus_CodeAndClosedAtBetween(1, "CLOSED", start, end)
         */
        List<Receipt> findByWarehouseIdAndStatus_CodeAndClosedAtBetween(
                        Integer warehouseId,
                        String statusCode,
                        LocalDateTime start,
                        LocalDateTime end);

        /**
         * JURNAL TOTAL (Audit):
         * Toate mișcările de pe un tab (Gestiune) indiferent dacă sunt CLOSED sau
         * CANCELLED.
         */
        List<Receipt> findByWarehouseIdAndClosedAtBetween(
                        Integer warehouseId,
                        LocalDateTime start,
                        LocalDateTime end);
}
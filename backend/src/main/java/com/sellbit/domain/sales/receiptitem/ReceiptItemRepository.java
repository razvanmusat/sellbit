package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.sellbit.domain.sales.receiptitem.ReceiptItemDTO.ProductTimelineResponse;
import com.sellbit.domain.sales.receiptitem.ReceiptItemDTO.QuantityReportResponse;

public interface ReceiptItemRepository extends JpaRepository<ReceiptItem, Integer> {

        // Găsește toate liniile unui bon specific, ordonate crescător după ID.
        List<ReceiptItem> findByReceiptIdOrderByIdAsc(Integer receiptId);

        /**
         * Profit brut: filtrat după gestiunea LINIEI (ri.warehouse.id), nu a bonului.
         */
        @Query("SELECT COALESCE(SUM(ri.netTotal - (COALESCE(ri.purchaseUnitPrice, 0) * ri.quantity)), 0) " +
                        "FROM ReceiptItem ri " +
                        "JOIN ri.receipt r " +
                        "WHERE r.closedAt BETWEEN :start AND :end " +
                        "AND r.status.code = 'CLOSED' " +
                        "AND r.internalCorrection = false " +
                        "AND ri.product.productType.code != 'ADVANCE' " +
                        "AND (:warehouseId IS NULL OR ri.warehouse.id = :warehouseId)")
        BigDecimal calculateTotalProfit(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("warehouseId") Integer warehouseId);

        /**
         * Cifra de afaceri: un rând per (bon, cotă TVA), filtrat după gestiunea LINIEI (ri.warehouse.id).
         * Fără retururi (bonuri cu original_receipt_id). Include liniile de avans. Rând: [receiptId, closedAt, vatRate, net, vat, total].
         */
        @Query("SELECT r.id, r.closedAt, ri.vatRate, " +
                        "COALESCE(SUM(ri.netTotal), 0), COALESCE(SUM(ri.vatTotal), 0), COALESCE(SUM(ri.lineTotal), 0) " +
                        "FROM ReceiptItem ri " +
                        "JOIN ri.receipt r " +
                        "WHERE r.closedAt BETWEEN :start AND :end " +
                        "AND r.status.code = 'CLOSED' " +
                        "AND r.internalCorrection = false " +
                        "AND r.originalReceipt IS NULL " +
                        "AND ri.warehouse.id = :warehouseId " +
                        "GROUP BY r.id, r.closedAt, ri.vatRate")
        List<Object[]> findTurnoverRows(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("warehouseId") Integer warehouseId);

        /**
         * Adaos comercial: un rând per produs, pe toate gestiunile.
         * Costul și vânzarea se adună DOAR pe liniile cu preț de achiziție > 0.
         * Rând: [productId, productName, cost, net (vânzare fără TVA)].
         */
        @Query("SELECT ri.product.id, ri.product.name, " +
                        "COALESCE(SUM(CASE WHEN ri.purchaseUnitPrice > 0 THEN ri.purchaseUnitPrice * ri.quantity ELSE 0 END), 0), " +
                        "COALESCE(SUM(CASE WHEN ri.purchaseUnitPrice > 0 THEN ri.netTotal ELSE 0 END), 0) " +
                        "FROM ReceiptItem ri " +
                        "JOIN ri.receipt r " +
                        "WHERE r.closedAt BETWEEN :start AND :end " +
                        "AND r.status.code = 'CLOSED' " +
                        "AND r.internalCorrection = false " +
                        "GROUP BY ri.product.id, ri.product.name " +
                        "ORDER BY ri.product.name ASC")
        List<Object[]> findMarkupRows(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        /**
         * Raport cantitativ: filtrat după gestiunea LINIEI (ri.warehouse.id).
         */
        @Query("SELECT new com.sellbit.domain.sales.receiptitem.ReceiptItemDTO$QuantityReportResponse(" +
                        "ri.product.name, SUM(ri.quantity), SUM(ri.lineTotal)) " +
                        "FROM ReceiptItem ri " +
                        "WHERE ri.receipt.status.code = 'CLOSED' " +
                        "AND ri.receipt.internalCorrection = false " +
                        "AND ri.receipt.closedAt BETWEEN :start AND :end " +
                        "AND (:warehouseId IS NULL OR ri.warehouse.id = :warehouseId) " +
                        "AND (" +
                        "  (:productIds IS NULL AND ri.product.productType.code != 'ADVANCE') " +
                        "  OR (ri.product.id IN :productIds)" +
                        ") " +
                        "GROUP BY ri.product.name " +
                        "ORDER BY ri.product.name ASC")
        List<QuantityReportResponse> getProductsQuantityReport(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("productIds") List<Integer> productIds,
                        @Param("warehouseId") Integer warehouseId);

        /**
         * Timeline produs: filtrat după gestiunea LINIEI (ri.warehouse.id).
         */
        @Query("SELECT new com.sellbit.domain.sales.receiptitem.ReceiptItemDTO$ProductTimelineResponse(" +
                        "ri.id, r.id, r.closedAt, COALESCE(u.fullName, 'N/A'), " +
                        "ri.quantity, ri.unitPrice, ri.lineTotal) " +
                        "FROM ReceiptItem ri " +
                        "JOIN ri.receipt r " +
                        "LEFT JOIN r.user u " +
                        "WHERE r.status.code = 'CLOSED' " +
                        "AND r.internalCorrection = false " +
                        "AND ri.product.id = :productId " +
                        "AND r.closedAt BETWEEN :start AND :end " +
                        "AND (:warehouseId IS NULL OR ri.warehouse.id = :warehouseId) " +
                        "ORDER BY r.closedAt DESC, ri.id DESC")
        List<ProductTimelineResponse> getProductTimeline(
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end,
                        @Param("productId") Integer productId,
                        @Param("warehouseId") Integer warehouseId);
}
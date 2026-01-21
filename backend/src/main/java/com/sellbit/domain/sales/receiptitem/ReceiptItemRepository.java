package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.sellbit.domain.sales.receiptitem.ReceiptItemDTO.QuantityReportResponse;

@Repository
public interface ReceiptItemRepository extends JpaRepository<ReceiptItem, Integer> {

    // Găsește toate liniile unui bon specific
    List<ReceiptItem> findByReceiptId(Integer receiptId);

    @Query("SELECT COALESCE(SUM(ri.netTotal - (COALESCE(ri.purchaseUnitPrice, 0) * ri.quantity)), 0) " +
            "FROM ReceiptItem ri " +
            "JOIN ri.receipt r " +
            "WHERE r.closedAt BETWEEN :start AND :end " +
            "AND r.status.code = 'CLOSED' " +
            "AND ri.product.productType.code != 'ADVANCE'")
    BigDecimal calculateTotalProfit(LocalDateTime start, LocalDateTime end);

    @Query("SELECT new com.sellbit.domain.sales.receiptitem.ReceiptItemDTO$QuantityReportResponse(ri.product.name, SUM(ri.quantity), SUM(ri.lineTotal)) "
            +
            "FROM ReceiptItem ri " +
            "WHERE ri.receipt.status.code = 'CLOSED' " +
            "AND ri.receipt.closedAt BETWEEN :start AND :end " +
            "AND (" +
            "  (:productIds IS NULL AND ri.product.productType.code != 'ADVANCE') " +
            "  OR (ri.product.id IN :productIds)" +
            ") " +
            "GROUP BY ri.product.name " +
            "ORDER BY ri.product.name ASC")
    List<QuantityReportResponse> getProductsQuantityReport(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            @Param("productIds") List<Integer> productIds);
}
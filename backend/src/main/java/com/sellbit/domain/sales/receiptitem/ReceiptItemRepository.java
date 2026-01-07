package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ReceiptItemRepository extends JpaRepository<ReceiptItem, Integer> {
    
    // Găsește toate liniile unui bon specific
    List<ReceiptItem> findByReceiptId(Integer receiptId);
    
    @Query("SELECT COALESCE(SUM(ri.netTotal - (COALESCE(ri.purchaseUnitPrice, 0) * ri.quantity)), 0) " +
    	       "FROM ReceiptItem ri " +
    	       "JOIN ri.receipt r " +
    	       "WHERE r.closedAt BETWEEN :start AND :end " +
    	       "AND r.status.code = 'CLOSED'")
    	BigDecimal calculateTotalProfit(LocalDateTime start, LocalDateTime end);
      
}
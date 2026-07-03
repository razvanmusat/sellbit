package com.sellbit.domain.inventory.stockadjustment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Integer> {

    // Toate ajustările pentru o anumită gestiune (Warehouse)
    List<StockAdjustment> findByWarehouseIdOrderByAdjustedAtDesc(Integer warehouseId);

    // Toate ajustările pentru un produs anume, în ordinea inversă a cronologiei (cele mai noi primele)
    List<StockAdjustment> findByProductIdOrderByAdjustedAtDesc(Integer productId);

    // Filtrare pentru rapoarte între două date (folosit pentru calendarele din React)
    List<StockAdjustment> findByAdjustedAtBetweenOrderByAdjustedAtDesc(LocalDateTime start, LocalDateTime end);

    // Query pentru a vedea pierderile pe un anumit motiv (ex: tot ce e "SPARGERE")
    @Query("SELECT s FROM StockAdjustment s WHERE s.reason.id = :reasonId ORDER BY s.adjustedAt DESC")
    List<StockAdjustment> findByReasonId(@Param("reasonId") Integer reasonId);

    List<StockAdjustment> findByWarehouseIdAndAdjustedAtBetweenOrderByAdjustedAtDesc(
            Integer warehouseId, 
            LocalDateTime start, 
            LocalDateTime end
    );
}
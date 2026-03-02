package com.sellbit.domain.cash.cashmovement;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CashMovementRepository extends JpaRepository<CashMovement, Integer> {
    
    // Pentru a vedea istoricul de mișcări al unei gestiuni specifice
    List<CashMovement> findByWarehouseIdOrderByCreatedAtDesc(Integer warehouseId);

    @EntityGraph(attributePaths = {"user", "movementType", "warehouse"})
    List<CashMovement> findByWarehouseIdAndCreatedAtBetweenOrderByCreatedAtDesc(
        Integer warehouseId, 
        LocalDateTime start, 
        LocalDateTime end
    );

    List<CashMovement> findByReceiptId(Integer receiptId);
}
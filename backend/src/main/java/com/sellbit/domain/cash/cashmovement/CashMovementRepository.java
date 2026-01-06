package com.sellbit.domain.cash.cashmovement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CashMovementRepository extends JpaRepository<CashMovement, Integer> {
    
    // Pentru a vedea istoricul de mișcări al unei gestiuni specifice
    List<CashMovement> findByWarehouseIdOrderByCreatedAtDesc(Integer warehouseId);
}
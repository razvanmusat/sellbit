package com.sellbit.domain.cash.cashdrawer;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface CashDrawerRepository extends JpaRepository<CashDrawer, Integer> {
    
    /**
     * Găsește rândul unic din sertar pentru o anumită gestiune.
     * Folosit pentru a prelua soldul curent înainte de update.
     */
    Optional<CashDrawer> findByWarehouseId(Integer warehouseId);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CashDrawer c WHERE c.warehouse.id = :warehouseId")
    Optional<CashDrawer> findByWarehouseIdForUpdate(Integer warehouseId);
}
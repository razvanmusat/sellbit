package com.sellbit.domain.inventory.warehouse;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Integer> {
    
    // 1. Validări unicitate
    boolean existsByCode(String code);
    boolean existsByCodeAndIdNot(String code, Integer id);

    // 2. Fetching după cod de business
    Optional<Warehouse> findByCode(String code);

    // 3. Filtrare pentru UI (Active / Inactive)
    List<Warehouse> findAllByIsActiveTrue();
    List<Warehouse> findAllByIsActiveFalse();

    // 4. Căutare pentru UI
    List<Warehouse> findAllByNameContainingIgnoreCase(String name);
}
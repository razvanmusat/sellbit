package com.sellbit.domain.inventory.stockcurrent;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockCurrentRepository extends JpaRepository<StockCurrent, StockCurrentId> {

    // Pentru WarehouseService: Verificăm dacă gestiunea e goală înainte de dezactivare
    boolean existsById_WarehouseIdAndQuantityGreaterThan(Integer warehouseId, BigDecimal quantity);

    // Pentru React: Când ești într-o gestiune și scanezi un produs
    Optional<StockCurrent> findById_WarehouseIdAndId_ProductId(Integer warehouseId, Integer productId);

    // Pentru React: Când încarci tabelul principal de stoc pentru gestiunea selectată
    List<StockCurrent> findById_WarehouseId(Integer warehouseId);
}
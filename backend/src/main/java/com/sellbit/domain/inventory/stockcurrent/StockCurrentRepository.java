package com.sellbit.domain.inventory.stockcurrent;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface StockCurrentRepository extends JpaRepository<StockCurrent, StockCurrentId> {

    // Pentru WarehouseService: Verificăm dacă gestiunea e goală înainte de dezactivare
    boolean existsById_WarehouseIdAndQuantityGreaterThan(Integer warehouseId, BigDecimal quantity);

    // Pentru React: Când ești într-o gestiune și scanezi un produs
    Optional<StockCurrent> findById_WarehouseIdAndId_ProductId(Integer warehouseId, Integer productId);

    // Pentru React: Când încarci tabelul principal de stoc pentru gestiunea selectată
    List<StockCurrent> findById_WarehouseId(Integer warehouseId);
    
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StockCurrent s WHERE s.id.warehouseId = :warehouseId AND s.id.productId = :productId")
    Optional<StockCurrent> findById_WarehouseIdAndId_ProductIdForUpdate(
        @Param("warehouseId") Integer warehouseId,
        @Param("productId") Integer productId
    );

    // Pentru print: doar produse cu stoc > 0 sau vândute cel puțin o dată în gestiunea respectivă
    @Query("SELECT s FROM StockCurrent s WHERE s.id.warehouseId = :warehouseId " +
           "AND (s.quantity > 0 " +
           "OR EXISTS (" +
           "  SELECT ri FROM ReceiptItem ri " +
           "  WHERE ri.product.id = s.id.productId " +
           "  AND ri.warehouse.id = :warehouseId " +
           "  AND ri.receipt.status.code = 'CLOSED' " +
           "  AND ri.receipt.internalCorrection = false" +
           "))")
    List<StockCurrent> findByWarehouseIdForPrint(@Param("warehouseId") Integer warehouseId);
}
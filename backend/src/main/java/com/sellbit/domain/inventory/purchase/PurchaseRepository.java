package com.sellbit.domain.inventory.purchase;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PurchaseRepository extends JpaRepository<Purchase, Integer> {

	List<Purchase> findByWarehouseId(Integer warehouseId);

	List<Purchase> findByProductId(Integer productId);

	List<Purchase> findByPurchasedAtBetween(LocalDateTime start, LocalDateTime end);

	// 1. Pentru Jurnal (Dată + Gestiune)
    List<Purchase> findByPurchasedAtBetweenAndWarehouseId(LocalDateTime start, LocalDateTime end, Integer warehouseId);

    // 2. Pentru Istoric Produs (Produs + Gestiune)
    List<Purchase> findByProductIdAndWarehouseId(Integer productId, Integer warehouseId);

	// Loturile active în ordine FEFO: expirarea cea mai apropiată prima,
	// fără expirare la final, apoi recepția și ID-ul pentru departajare.
	@Query("SELECT p FROM Purchase p WHERE p.warehouse.id = :wId AND p.product.id = :pId "
			+ "AND p.remainingQuantity > 0 ORDER BY "
			+ "CASE WHEN p.expirationDate IS NULL THEN 1 ELSE 0 END ASC, "
			+ "p.expirationDate ASC, p.purchasedAt ASC, p.id ASC")
    List<Purchase> findActiveBatchesFEFO(Integer wId, Integer pId);

	// Istoric în ordinea recepției, folosit doar ca fallback când nu există lot activ.
	@Query("SELECT p FROM Purchase p WHERE p.warehouse.id = :wId AND p.product.id = :pId ORDER BY p.purchasedAt ASC, p.id ASC")
    List<Purchase> findAllBatchesByReception(Integer wId, Integer pId);

	@Query("SELECT p FROM Purchase p WHERE p.remainingQuantity > 0 " + "AND p.expirationDate IS NOT NULL "
			+ "AND p.expirationDate <= :thresholdDate " + "ORDER BY p.expirationDate ASC")
	List<Purchase> findExpiringBatches(LocalDate thresholdDate);
}

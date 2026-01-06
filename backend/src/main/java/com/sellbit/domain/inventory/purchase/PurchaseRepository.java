package com.sellbit.domain.inventory.purchase;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Integer> {

	List<Purchase> findByWarehouseId(Integer warehouseId);

	List<Purchase> findByProductId(Integer productId);

	List<Purchase> findByPurchasedAtBetween(LocalDateTime start, LocalDateTime end);

	// Loturile care mai au marfă, cele mai vechi primele
	@Query("SELECT p FROM Purchase p WHERE p.warehouse.id = :wId AND p.product.id = :pId AND p.remainingQuantity > 0 ORDER BY p.purchasedAt ASC, p.id ASC")
    List<Purchase> findActiveBatchesFIFO(Integer wId, Integer pId);

	// Toate loturile pentru un produs, cele mai vechi primele (pentru refill)
	@Query("SELECT p FROM Purchase p WHERE p.warehouse.id = :wId AND p.product.id = :pId ORDER BY p.purchasedAt ASC, p.id ASC")
    List<Purchase> findAllBatchesFIFO(Integer wId, Integer pId);

	@Query("SELECT p FROM Purchase p WHERE p.remainingQuantity > 0 " + "AND p.expirationDate IS NOT NULL "
			+ "AND p.expirationDate <= :thresholdDate " + "ORDER BY p.expirationDate ASC")
	List<Purchase> findExpiringBatches(LocalDate thresholdDate);
}
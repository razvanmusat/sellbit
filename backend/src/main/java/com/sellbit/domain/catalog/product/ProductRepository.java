package com.sellbit.domain.catalog.product;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, Integer> {
	// --- PENTRU ADMIN (Vede tot) ---

	// Produsele dintr-o categorie, ordonate alfabetic
	@Query("SELECT p FROM Product p " +
			"JOIN FETCH p.category c " +
			"JOIN FETCH p.productType pt " +
			"JOIN FETCH p.unit u " +
			"JOIN FETCH p.vatRate vr " +
			"WHERE c.id = :categoryId " +
			"ORDER BY p.name ASC")
	List<Product> findByCategoryIdOrderByNameAsc(@Param("categoryId") Integer categoryId);

	// Căutare generală după nume (activ + inactiv)
	@Query("SELECT p FROM Product p " +
			"JOIN FETCH p.category c " +
			"JOIN FETCH p.productType pt " +
			"JOIN FETCH p.unit u " +
			"JOIN FETCH p.vatRate vr " +
			"WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')) " +
			"ORDER BY p.name ASC")
	List<Product> findByNameContainingIgnoreCaseOrderByNameAsc(@Param("name") String name);

	// --- PENTRU VÂNZARE / POS (Vede doar Active) ---

	// Doar produsele active dintr-o categorie
	@Query("SELECT p FROM Product p " +
			"JOIN FETCH p.category c " +
			"JOIN FETCH p.productType pt " +
			"JOIN FETCH p.unit u " +
			"JOIN FETCH p.vatRate vr " +
			"WHERE c.id = :categoryId AND p.isActive = true " +
			"ORDER BY p.name ASC")
	List<Product> findByCategoryIdAndIsActiveTrueOrderByNameAsc(@Param("categoryId") Integer categoryId);

	// Căutare după nume doar în produsele active (Exlude AVANSUL)
	@Query("SELECT p FROM Product p " +
			"JOIN FETCH p.category c " +
			"JOIN FETCH p.productType pt " +
			"JOIN FETCH p.unit u " +
			"JOIN FETCH p.vatRate vr " +
           "WHERE p.isActive = true " +
           "AND LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')) " +
           "AND p.productType.code <> 'ADVANCE' " + // <--- Aici e "șopârla": excludem AVANSUL direct
           "ORDER BY p.name ASC")
    List<Product> findByNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(@Param("name") String name);

	@Query("SELECT p FROM Product p " +
			"JOIN FETCH p.category c " +
			"JOIN FETCH p.productType pt " +
			"JOIN FETCH p.unit u " +
			"JOIN FETCH p.vatRate vr " +
			"WHERE pt.code = 'MENU' " +
			"ORDER BY p.name ASC")
	List<Product> findMenusForAdmin();

	// Căutare exactă cod bare - aici returnăm tot,
	// dar Service-ul va decide ce face dacă e inactiv
	Optional<Product> findByBarcode(String barcode);

	@Query("SELECT p FROM Product p WHERE p.productType.code = :typeCode AND p.isActive = true")
	List<Product> findByProductTypeCode(@Param("typeCode") String typeCode);

	// --- VALIDĂRI ---
	boolean existsByBarcode(String barcode);

	// Găsește produse de un anumit tip care au prețul de achiziție setat
	List<Product> findByProductTypeCodeAndPurchasePriceIsNotNull(String typeCode);

	@Query("SELECT p FROM Product p " +
			"JOIN FETCH p.category c " +
			"JOIN FETCH p.productType pt " +
			"JOIN FETCH p.unit u " +
			"JOIN FETCH p.vatRate vr " +
			"WHERE pt.code = 'CATERING' AND p.isActive = true")
	List<Product> findAllCateringProducts();

	List<Product> findByCategoryId(Integer categoryId);
}
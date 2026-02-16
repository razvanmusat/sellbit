package com.sellbit.domain.catalog.product;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
	// --- PENTRU ADMIN (Vede tot) ---

	// Produsele dintr-o categorie, ordonate alfabetic
	List<Product> findByCategoryIdOrderByNameAsc(Integer categoryId);

	// Căutare generală după nume (activ + inactiv)
	List<Product> findByNameContainingIgnoreCaseOrderByNameAsc(String name);

	// --- PENTRU VÂNZARE / POS (Vede doar Active) ---

	// Doar produsele active dintr-o categorie
	List<Product> findByCategoryIdAndIsActiveTrueOrderByNameAsc(Integer categoryId);

	// Căutare după nume doar în produsele active (Exlude AVANSUL)
	@Query("SELECT p FROM Product p " +
           "WHERE p.isActive = true " +
           "AND LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%')) " +
           "AND p.productType.code <> 'ADVANCE' " + // <--- Aici e "șopârla": excludem AVANSUL direct
           "ORDER BY p.name ASC")
    List<Product> findByNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(@Param("name") String name);

	// Căutare exactă cod bare - aici returnăm tot,
	// dar Service-ul va decide ce face dacă e inactiv
	Optional<Product> findByBarcode(String barcode);

	@Query("SELECT p FROM Product p WHERE p.productType.code = :typeCode AND p.isActive = true")
	List<Product> findByProductTypeCode(@Param("typeCode") String typeCode);

	// --- VALIDĂRI ---
	boolean existsByBarcode(String barcode);

	// Găsește produse de un anumit tip care au prețul de achiziție setat
	List<Product> findByProductTypeCodeAndPurchasePriceIsNotNull(String typeCode);

	@Query("SELECT p FROM Product p WHERE p.productType.code = 'CATERING' AND p.isActive = true")
	List<Product> findAllCateringProducts();

	List<Product> findByCategoryId(Integer categoryId);
}
package com.sellbit.domain.catalog.product;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

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

	// Căutare după nume doar în produsele active
	List<Product> findByNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(String name);

	// Căutare exactă cod bare - aici returnăm tot,
	// dar Service-ul va decide ce face dacă e inactiv
	Optional<Product> findByBarcode(String barcode);

	// --- VALIDĂRI ---
	boolean existsByBarcode(String barcode);

}
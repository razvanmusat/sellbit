package com.sellbit.domain.catering.cateringmenu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CateringMenuRepository extends JpaRepository<CateringMenu, Integer> {

    // Pentru calculul profitului - chirurgical
    Optional<CateringMenu> findByProductIdAndIsActiveTrue(Integer productId);

    /**
     * Pentru Angajați și Admin (listă activă).
     * Facem JOIN cu Product pentru a putea sorta după numele real al produsului.
     */
    @Query("SELECT cm FROM CateringMenu cm JOIN Product p ON cm.productId = p.id " +
           "WHERE cm.isActive = true ORDER BY p.name ASC")
    List<CateringMenu> findByIsActiveTrueOrderByNameAsc();

    /**
     * Pentru Admin: vizualizarea produselor inactive, sortate după nume.
     */
    @Query("SELECT cm FROM CateringMenu cm JOIN Product p ON cm.productId = p.id " +
           "WHERE cm.isActive = false ORDER BY p.name ASC")
    List<CateringMenu> findByIsActiveFalseOrderByNameAsc();
}
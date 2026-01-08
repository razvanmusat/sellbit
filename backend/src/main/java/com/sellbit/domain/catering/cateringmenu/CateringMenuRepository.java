package com.sellbit.domain.catering.cateringmenu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CateringMenuRepository extends JpaRepository<CateringMenu, Integer> {

    /**
     * Pentru Angajați (dropdown) și Admin (listă activă).
     */
    List<CateringMenu> findByIsActiveTrueOrderByNameAsc();

    /**
     * Pentru Admin: vizualizarea produselor scoase din ofertă pentru reactivare.
     */
    List<CateringMenu> findByIsActiveFalseOrderByNameAsc();
}
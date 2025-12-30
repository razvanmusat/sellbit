package com.sellbit.domain.catalog.category;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    // Pentru navigarea în Tree (Admin & POS)
    List<Category> findByParentIsNullOrderByLabelAsc();
    List<Category> findByParentIdOrderByLabelAsc(Integer parentId);

    // Pentru validări la creare/editare
    boolean existsByCode(String code);
    Optional<Category> findByCode(String code);

    // Pentru mutarea produselor: aduce DOAR categoriile care nu au subcategorii (destinații finale)
    @Query("SELECT c FROM Category c WHERE NOT EXISTS (SELECT 1 FROM Category sub WHERE sub.parent = c) ORDER BY c.label ASC")
    List<Category> findLeafCategories();
    
    // Dacă totuși ai nevoie de absolut toate pentru vreo listă plată
    List<Category> findAllByOrderByLabelAsc();
    boolean existsByParent_Id(Integer parentId);


}
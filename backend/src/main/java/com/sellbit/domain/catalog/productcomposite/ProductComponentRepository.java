package com.sellbit.domain.catalog.productcomposite;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductComponentRepository extends JpaRepository<ProductComponent, Integer> {
    
    List<ProductComponent> findByParentProductIdAndIsActiveTrue(Integer parentProductId);
    
    List<ProductComponent> findByParentProductIdAndIsActiveFalse(Integer parentProductId);

    @Modifying
    @Query("UPDATE ProductComponent pc SET pc.isActive = false WHERE pc.parentProduct.id = :parentId AND pc.isActive = true")
    void deactivateComponentsByParentId(@Param("parentId") Integer parentId);
}
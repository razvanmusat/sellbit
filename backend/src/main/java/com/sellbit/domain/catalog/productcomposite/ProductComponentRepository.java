package com.sellbit.domain.catalog.productcomposite;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductComponentRepository extends JpaRepository<ProductComponent, Integer> {
    
    @Query("SELECT pc FROM ProductComponent pc " +
        "JOIN FETCH pc.childProduct cp " +
        "LEFT JOIN FETCH cp.unit u " +
        "LEFT JOIN FETCH cp.forcedWarehouse fw " +
        "WHERE pc.parentProduct.id = :parentProductId " +
        "AND pc.isActive = true")
    List<ProductComponent> findByParentProductIdAndIsActiveTrue(@Param("parentProductId") Integer parentProductId);

    @Query("SELECT pc FROM ProductComponent pc " +
        "JOIN FETCH pc.childProduct cp " +
        "LEFT JOIN FETCH cp.unit u " +
        "LEFT JOIN FETCH cp.forcedWarehouse fw " +
        "WHERE pc.parentProduct.id = :parentProductId " +
        "AND pc.isActive = false")
    List<ProductComponent> findByParentProductIdAndIsActiveFalse(@Param("parentProductId") Integer parentProductId);

    @Modifying
    @Query("UPDATE ProductComponent pc SET pc.isActive = false WHERE pc.parentProduct.id = :parentId AND pc.isActive = true")
    void deactivateComponentsByParentId(@Param("parentId") Integer parentId);
}
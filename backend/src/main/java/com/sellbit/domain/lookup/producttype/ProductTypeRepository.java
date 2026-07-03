package com.sellbit.domain.lookup.producttype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProductTypeRepository extends JpaRepository<ProductType, Integer> {
    Optional<ProductType> findByCode(String code);
    List<ProductType> findAllByIsActiveTrue();
}
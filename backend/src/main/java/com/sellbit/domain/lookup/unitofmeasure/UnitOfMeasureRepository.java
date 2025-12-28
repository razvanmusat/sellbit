package com.sellbit.domain.lookup.unitofmeasure;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UnitOfMeasureRepository extends JpaRepository<UnitOfMeasure, Integer> {
    Optional<UnitOfMeasure> findByCode(String code);
    List<UnitOfMeasure> findAllByIsActiveTrue();
}
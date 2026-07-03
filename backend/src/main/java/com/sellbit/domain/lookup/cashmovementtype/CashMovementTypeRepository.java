package com.sellbit.domain.lookup.cashmovementtype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CashMovementTypeRepository extends JpaRepository<CashMovementType, Integer> {
    Optional<CashMovementType> findByCode(String code);
    List<CashMovementType> findAllByIsActiveTrue();
}
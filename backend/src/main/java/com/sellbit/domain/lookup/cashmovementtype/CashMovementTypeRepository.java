package com.sellbit.domain.lookup.cashmovementtype;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CashMovementTypeRepository extends JpaRepository<CashMovementType, Integer> {
    Optional<CashMovementType> findByCode(String code);
    List<CashMovementType> findAllByIsActiveTrue();
}
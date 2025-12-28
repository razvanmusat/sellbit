package com.sellbit.domain.lookup.vatrate;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface VatRateRepository extends JpaRepository<VatRate, Integer> {
    Optional<VatRate> findByCode(String code);
    List<VatRate> findAllByIsActiveTrue();
}
package com.sellbit.domain.lookup.vatrate;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface VatRateRepository extends JpaRepository<VatRate, Integer> {
    Optional<VatRate> findByCode(String code);
    List<VatRate> findAllByIsActiveTrue();
}
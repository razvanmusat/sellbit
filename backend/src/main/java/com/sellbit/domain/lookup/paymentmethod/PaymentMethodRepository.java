package com.sellbit.domain.lookup.paymentmethod;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, Integer> {
    Optional<PaymentMethod> findByCode(String code);
    List<PaymentMethod> findAllByIsActiveTrue();
}
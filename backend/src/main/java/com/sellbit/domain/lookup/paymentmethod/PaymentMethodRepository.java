package com.sellbit.domain.lookup.paymentmethod;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentMethodRepository extends JpaRepository<PaymentMethod, Integer> {
    Optional<PaymentMethod> findByCode(String code);
    List<PaymentMethod> findAllByIsActiveTrue();
}
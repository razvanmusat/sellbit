package com.sellbit.domain.lookup.paymentmethod;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentMethodService {

    private final PaymentMethodRepository repository;

    public List<PaymentMethod> getAll() {
        return repository.findAll();
    }

    public List<PaymentMethod> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public PaymentMethod save(PaymentMethod method) {
        return repository.save(method);
    }

    @Transactional
    public void deleteLogical(Integer id) {
        repository.findById(id).ifPresent(method -> {
            method.setActive(false);
            repository.save(method);
        });
    }
}
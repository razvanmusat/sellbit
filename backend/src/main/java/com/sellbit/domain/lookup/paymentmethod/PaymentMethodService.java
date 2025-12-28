package com.sellbit.domain.lookup.paymentmethod;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

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
    	if (method.getId() != null && !repository.existsById(method.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(method);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	PaymentMethod method = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        method.setActive(false);
        repository.save(method);
    }
}
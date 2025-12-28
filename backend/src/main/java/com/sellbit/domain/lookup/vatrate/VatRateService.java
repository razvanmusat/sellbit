package com.sellbit.domain.lookup.vatrate;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VatRateService {

    private final VatRateRepository repository;

    public List<VatRate> getAll() {
        return repository.findAll();
    }

    public List<VatRate> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public VatRate save(VatRate vatRate) {
    	if (vatRate.getId() != null && !repository.existsById(vatRate.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(vatRate);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	VatRate vatRate = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
    	vatRate.setActive(false);
        repository.save(vatRate);
    }
}
package com.sellbit.domain.lookup.vatrate;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
        return repository.save(vatRate);
    }

    @Transactional
    public void deleteLogical(Integer id) {
        repository.findById(id).ifPresent(vatRate -> {
            vatRate.setActive(false);
            repository.save(vatRate);
        });
    }
}
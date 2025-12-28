package com.sellbit.domain.lookup.cashmovementtype;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CashMovementTypeService {

    private final CashMovementTypeRepository repository;

    public List<CashMovementType> getAll() {
        return repository.findAll();
    }

    public List<CashMovementType> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public CashMovementType save(CashMovementType type) {
        return repository.save(type);
    }

    @Transactional
    public void deleteLogical(Integer id) {
        repository.findById(id).ifPresent(type -> {
            type.setActive(false);
            repository.save(type);
        });
    }
}
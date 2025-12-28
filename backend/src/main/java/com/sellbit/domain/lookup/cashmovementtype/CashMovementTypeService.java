package com.sellbit.domain.lookup.cashmovementtype;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

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
    	if (type.getId() != null && !repository.existsById(type.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(type);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	CashMovementType type = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        type.setActive(false);
        repository.save(type);
    }
}
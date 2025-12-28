package com.sellbit.domain.lookup.unitofmeasure;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UnitOfMeasureService {

    private final UnitOfMeasureRepository repository;

    public List<UnitOfMeasure> getAll() {
        return repository.findAll();
    }

    public List<UnitOfMeasure> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public UnitOfMeasure save(UnitOfMeasure uom) {
    	if (uom.getId() != null && !repository.existsById(uom.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(uom);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	UnitOfMeasure uom = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        uom.setActive(false);
        repository.save(uom);
    }
}
package com.sellbit.domain.lookup.unitofmeasure;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
        return repository.save(uom);
    }

    @Transactional
    public void deleteLogical(Integer id) {
        repository.findById(id).ifPresent(uom -> {
            uom.setActive(false);
            repository.save(uom);
        });
    }
}
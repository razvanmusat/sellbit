package com.sellbit.domain.lookup.producttype;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductTypeService {

    private final ProductTypeRepository repository;

    public List<ProductType> getAll() {
        return repository.findAll();
    }

    public List<ProductType> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public ProductType save(ProductType type) {
    	if (type.getId() != null && !repository.existsById(type.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(type);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	ProductType type = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        type.setActive(false);
        repository.save(type);
    }
} 
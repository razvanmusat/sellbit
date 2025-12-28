package com.sellbit.domain.lookup.producttype;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
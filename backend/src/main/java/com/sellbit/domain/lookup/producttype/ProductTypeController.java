package com.sellbit.domain.lookup.producttype;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/product-types")
@RequiredArgsConstructor
public class ProductTypeController {

    private final ProductTypeService service;

    @GetMapping
    public ResponseEntity<List<ProductType>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ProductType>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostMapping
    public ResponseEntity<ProductType> create(@RequestBody ProductType type) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(type));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductType> update(@PathVariable Integer id, @RequestBody ProductType type) {
        type.setId(id);
        return ResponseEntity.ok(service.save(type));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
package com.sellbit.domain.lookup.producttype;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/product-types")
@RequiredArgsConstructor
public class ProductTypeController {

    private final ProductTypeService service;

    @PostAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<ProductType>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active") //Pentru listare drop-down (doar active).
    public ResponseEntity<List<ProductType>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare tip nou
    public ResponseEntity<ProductType> create(@RequestBody ProductType type) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(type));
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") //CONFIG: Modificare tip existent. Niciodata codul doar labelul.
    public ResponseEntity<ProductType> update(@PathVariable Integer id, @RequestBody ProductType type) {
        type.setId(id);
        return ResponseEntity.ok(service.save(type));
    }

    @PostAuthorize("hasAnyAuthority('100')")    
    @DeleteMapping("/{id}") //Dezactivare tip (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
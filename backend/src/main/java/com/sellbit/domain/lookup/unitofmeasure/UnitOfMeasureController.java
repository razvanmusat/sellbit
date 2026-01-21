package com.sellbit.domain.lookup.unitofmeasure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/units-of-measure")
@RequiredArgsConstructor
public class UnitOfMeasureController {

    private final UnitOfMeasureService service;

    @PostAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<UnitOfMeasure>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active") //Pentru listare drop-down (doar active).
    public ResponseEntity<List<UnitOfMeasure>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare unitate nouă
    public ResponseEntity<UnitOfMeasure> create(@RequestBody UnitOfMeasure uom) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(uom));
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") //CONFIG: Modificare unitate existentă. Niciodata codul doar labelul.
    public ResponseEntity<UnitOfMeasure> update(@PathVariable Integer id, @RequestBody UnitOfMeasure uom) {
        uom.setId(id);
        return ResponseEntity.ok(service.save(uom));
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}") //  Dezactivare unitate (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
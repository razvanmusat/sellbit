package com.sellbit.domain.lookup.unitofmeasure;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/units-of-measure")
@RequiredArgsConstructor
public class UnitOfMeasureController {

    private final UnitOfMeasureService service;

    @GetMapping
    public ResponseEntity<List<UnitOfMeasure>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<UnitOfMeasure>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostMapping
    public ResponseEntity<UnitOfMeasure> create(@RequestBody UnitOfMeasure uom) {
        UnitOfMeasure saved = service.save(uom);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UnitOfMeasure> update(@PathVariable Integer id, @RequestBody UnitOfMeasure uom) {
        uom.setId(id);
        return ResponseEntity.ok(service.save(uom));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
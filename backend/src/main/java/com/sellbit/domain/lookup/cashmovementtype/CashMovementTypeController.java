package com.sellbit.domain.lookup.cashmovementtype;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/cash-movement-types")
@RequiredArgsConstructor
public class CashMovementTypeController {

    private final CashMovementTypeService service;

    @GetMapping
    public ResponseEntity<List<CashMovementType>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<CashMovementType>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostMapping
    public ResponseEntity<CashMovementType> create(@RequestBody CashMovementType type) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(type));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CashMovementType> update(@PathVariable Integer id, @RequestBody CashMovementType type) {
        type.setId(id);
        return ResponseEntity.ok(service.save(type));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
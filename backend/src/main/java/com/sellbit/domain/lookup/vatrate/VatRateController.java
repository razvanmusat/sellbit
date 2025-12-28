package com.sellbit.domain.lookup.vatrate;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/vat-rates")
@RequiredArgsConstructor
public class VatRateController {

    private final VatRateService service;

    @GetMapping
    public ResponseEntity<List<VatRate>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<VatRate>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostMapping
    public ResponseEntity<VatRate> create(@RequestBody VatRate vatRate) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(vatRate));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VatRate> update(@PathVariable Integer id, @RequestBody VatRate vatRate) {
        vatRate.setId(id);
        return ResponseEntity.ok(service.save(vatRate));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
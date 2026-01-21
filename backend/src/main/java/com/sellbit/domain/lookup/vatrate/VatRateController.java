package com.sellbit.domain.lookup.vatrate;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/vat-rates")
@RequiredArgsConstructor
public class VatRateController {

    private final VatRateService service;

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping //  CONFIG: Lista completă (inclusiv cele inactive). Istoric rate TVA.
    public ResponseEntity<List<VatRate>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PreAuthorize("hasAnyAuthority('100')") 
    @GetMapping("/active") //Pentru listare drop-down (doar active).
    public ResponseEntity<List<VatRate>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare rată TVA nouă
    public ResponseEntity<VatRate> create(@RequestBody VatRate vatRate) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(vatRate));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") //CONFIG: Modificare rată TVA existentă. Niciodata codul doar labelul. 
    public ResponseEntity<VatRate> update(@PathVariable Integer id, @RequestBody VatRate vatRate) {
        vatRate.setId(id);
        return ResponseEntity.ok(service.save(vatRate));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}") //Dezactivare rată TVA (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
package com.sellbit.domain.lookup.cashmovementtype;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/cash-movement-types")
@RequiredArgsConstructor
public class CashMovementTypeController {

    private final CashMovementTypeService service;

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<CashMovementType>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active") //Pentru listare drop-down (doar active).
    public ResponseEntity<List<CashMovementType>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare tip nou
    public ResponseEntity<CashMovementType> create(@RequestBody CashMovementType type) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(type));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}")//CONFIG: Modificare tip existent. Niciodata codul doar labelul.
    public ResponseEntity<CashMovementType> update(@PathVariable Integer id, @RequestBody CashMovementType type) {
        type.setId(id);
        return ResponseEntity.ok(service.save(type));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}")//Dezactivare tip (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
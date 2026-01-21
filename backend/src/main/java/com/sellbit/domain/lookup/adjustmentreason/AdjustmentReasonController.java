package com.sellbit.domain.lookup.adjustmentreason;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/adjustment-reasons")
@RequiredArgsConstructor
public class AdjustmentReasonController {
    
    private final AdjustmentReasonService service;
    
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<AdjustmentReason>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }
    
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active") //Pentru listare drop-down (doar active).
    public ResponseEntity<List<AdjustmentReason>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }
    
    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare motiv nou (ex: "Furt", "Protocol").
    public ResponseEntity<AdjustmentReason> create(@RequestBody AdjustmentReason reason) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(reason));
    }
    
    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}")//CONFIG: Modificare motiv existent. Niciodata codul doar labelul.
    public ResponseEntity<AdjustmentReason> update(@PathVariable Integer id, @RequestBody AdjustmentReason reason) {
        reason.setId(id);
        return ResponseEntity.ok(service.save(reason));
    }
    
    @PreAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}") //Dezactivare motiv (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
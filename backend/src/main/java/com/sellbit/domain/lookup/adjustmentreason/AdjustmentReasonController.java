package com.sellbit.domain.lookup.adjustmentreason;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/adjustment-reasons")
@RequiredArgsConstructor
public class AdjustmentReasonController {
    
    private final AdjustmentReasonService service;
    
    @GetMapping
    public ResponseEntity<List<AdjustmentReason>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }
    
    @GetMapping("/active")
    public ResponseEntity<List<AdjustmentReason>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }
    
    @PostMapping
    public ResponseEntity<AdjustmentReason> create(@RequestBody AdjustmentReason reason) {
        AdjustmentReason saved = service.save(reason);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<AdjustmentReason> update(@PathVariable Integer id, @RequestBody AdjustmentReason reason) {
        reason.setId(id);
        return ResponseEntity.ok(service.save(reason));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
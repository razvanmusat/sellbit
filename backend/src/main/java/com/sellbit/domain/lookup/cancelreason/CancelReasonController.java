package com.sellbit.domain.lookup.cancelreason;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/cancel-reasons")
@RequiredArgsConstructor
public class CancelReasonController {
    
    private final CancelReasonService service;
    
    @GetMapping
    public ResponseEntity<List<CancelReason>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }
    
    @GetMapping("/active")
    public ResponseEntity<List<CancelReason>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }
    
    @PostMapping
    public ResponseEntity<CancelReason> create(@RequestBody CancelReason reason) {
    	CancelReason saved = service.save(reason);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<CancelReason> update(@PathVariable Integer id, @RequestBody CancelReason reason) {
        reason.setId(id);
        return ResponseEntity.ok(service.save(reason));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build(); 
    }
}
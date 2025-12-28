package com.sellbit.domain.lookup.receiptstatus;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/receipt-statuses")
@RequiredArgsConstructor
public class ReceiptStatusController {

    private final ReceiptStatusService service;

    @GetMapping
    public ResponseEntity<List<ReceiptStatus>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<ReceiptStatus>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostMapping
    public ResponseEntity<ReceiptStatus> create(@RequestBody ReceiptStatus status) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(status));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ReceiptStatus> update(@PathVariable Integer id, @RequestBody ReceiptStatus status) {
        status.setId(id);
        return ResponseEntity.ok(service.save(status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
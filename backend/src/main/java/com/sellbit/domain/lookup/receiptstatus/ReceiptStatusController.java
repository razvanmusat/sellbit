package com.sellbit.domain.lookup.receiptstatus;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/receipt-statuses")
@RequiredArgsConstructor
public class ReceiptStatusController {

    private final ReceiptStatusService service;

    @PostAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<ReceiptStatus>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PostAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active") //Pentru listare drop-down (doar active).
    public ResponseEntity<List<ReceiptStatus>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare status nou
    public ResponseEntity<ReceiptStatus> create(@RequestBody ReceiptStatus status) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(status));
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") //CONFIG: Modificare status existent. Niciodata codul doar labelul.
    public ResponseEntity<ReceiptStatus> update(@PathVariable Integer id, @RequestBody ReceiptStatus status) {
        status.setId(id);
        return ResponseEntity.ok(service.save(status));
    }

    @PostAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}") //Dezactivare status (ștergere logică). 
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
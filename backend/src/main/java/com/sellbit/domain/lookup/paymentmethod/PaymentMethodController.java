package com.sellbit.domain.lookup.paymentmethod;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodController {

    private final PaymentMethodService service;

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<PaymentMethod>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active")//Pentru listare drop-down (doar active).
    public ResponseEntity<List<PaymentMethod>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Adăugare metodă (ex: "Tichete Masă").
    public ResponseEntity<PaymentMethod> create(@RequestBody PaymentMethod method) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(method));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") // CONFIG: Modificare metodă existentă. Niciodata codul doar labelul.
    public ResponseEntity<PaymentMethod> update(@PathVariable Integer id, @RequestBody PaymentMethod method) {
        method.setId(id);
        return ResponseEntity.ok(service.save(method));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}") //Dezactivare metodă (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
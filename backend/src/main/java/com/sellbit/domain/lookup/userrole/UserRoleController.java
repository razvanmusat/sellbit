package com.sellbit.domain.lookup.userrole;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/lookup/user-roles")
@RequiredArgsConstructor
public class UserRoleController {

    private final UserRoleService service;

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping //CONFIG: Lista completă (inclusiv cele inactive).
    public ResponseEntity<List<UserRole>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/active") // Folosită în Admin Panel la crearea unui User nou (Dropdown "Select Role").
    public ResponseEntity<List<UserRole>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping //CONFIG: Creare rol nou
    public ResponseEntity<UserRole> create(@Valid @RequestBody UserRole role) {
    	return ResponseEntity.status(HttpStatus.CREATED).body(service.save(role));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") // CONFIG: Modificare rol existent. Niciodata codul doar labelul.
    public ResponseEntity<UserRole> update(@PathVariable Integer id, @Valid @RequestBody UserRole role) {
        role.setId(id);
        return ResponseEntity.ok(service.save(role));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/{id}") //Dezactivare rol (ștergere logică).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteLogical(id);
        return ResponseEntity.noContent().build();
    }
}
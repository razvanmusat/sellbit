package com.sellbit.domain.security.user;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/security/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // --- ADMIN: LISTARE ---
    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/active")
    public ResponseEntity<List<UserDTOs.Response>> getAllActive() {
        return ResponseEntity.ok(userService.getAllActive());
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/inactive")
    public ResponseEntity<List<UserDTOs.Response>> getAllInactive() {
        return ResponseEntity.ok(userService.getAllInactive());
    }

    // --- ADMIN: CREARE (Returnează parola temporară) ---
    @PreAuthorize("hasAuthority('100')")
    @PostMapping
    public ResponseEntity<UserDTOs.Response> create(@Valid @RequestBody UserDTOs.Create dto) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(userService.create(dto));
    }

    // --- ADMIN: UPDATE ---
    @PreAuthorize("hasAuthority('100')")
    @PutMapping("/{id}")
    public ResponseEntity<UserDTOs.Response> update(
            @PathVariable Integer id,
            @Valid @RequestBody UserDTOs.Update dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    // --- ADMIN: STATUS ---
    @PreAuthorize("hasAuthority('100')")
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<UserDTOs.Response> toggleStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.toggleStatus(id));
    }

    // --- ADMIN: RESET PASSWORD (Generează una nouă și o returnează) ---
    @PreAuthorize("hasAuthority('100')")
    @PatchMapping("/{id}/reset-password")
    public ResponseEntity<UserDTOs.Response> resetPassword(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.resetPassword(id));
    }

    // --- USER: CHANGE OWN PASSWORD (Cere parola veche + nouă) ---
    @PreAuthorize("isAuthenticated()")
    @PatchMapping("/me/password")
    public ResponseEntity<Void> changeOwnPassword(@Valid @RequestBody UserDTOs.ChangeOwnPassword dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        userService.changeOwnPassword(auth.getName(), dto);
        return ResponseEntity.noContent().build();
    }
}
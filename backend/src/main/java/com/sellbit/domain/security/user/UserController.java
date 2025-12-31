package com.sellbit.domain.security.user;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/security/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // --- LISTARE ---
    @GetMapping("/active")
    public ResponseEntity<List<UserResponseDTO>> getAllActive() {
        return ResponseEntity.ok(userService.getAllActive());
    }

    @GetMapping("/inactive")
    public ResponseEntity<List<UserResponseDTO>> getAllInactive() {
        return ResponseEntity.ok(userService.getAllInactive());
    }

    // --- CREATE ---
    @PostMapping
    public ResponseEntity<UserResponseDTO> create(@Valid @RequestBody CreateUserDTO dto) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(userService.create(dto));
    }

    // --- UPDATE ---
    @PutMapping("/{id}")
    public ResponseEntity<UserResponseDTO> update(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateUserDTO dto) {
        return ResponseEntity.ok(userService.update(id, dto));
    }

    // --- TOGGLE STATUS ---
    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<UserResponseDTO> toggleStatus(@PathVariable Integer id) {
        return ResponseEntity.ok(userService.toggleStatus(id));
    }

    // --- CHANGE PASSWORD ---
    @PatchMapping("/{id}/change-password")
    public ResponseEntity<Void> changePassword(
            @PathVariable Integer id,
            @Valid @RequestBody ChangePasswordDTO dto) {
        userService.changePassword(id, dto);
        return ResponseEntity.noContent().build();
    }
}

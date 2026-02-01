package com.sellbit.domain.cash.cashmovement;

import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/cash/movements")
@RequiredArgsConstructor
public class CashMovementController {

    private final CashMovementService cashMovementService;
    private final CashMovementRepository cashMovementRepository;

    /**
     * Înregistrează o mișcare manuală (ex: Depunere Bancă, Plată Furnizor).
     * POST /api/cash/movements
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping
    public ResponseEntity<Void> createMovement(
            @RequestParam Integer warehouseId,
            @RequestParam String typeCode,
            @RequestParam BigDecimal amount,
            @RequestParam Integer userId,
            @RequestParam(required = false) String note) {
        
        cashMovementService.createMovement(warehouseId, typeCode, amount, userId, note);
        return ResponseEntity.ok().build();
    }

    /**
     * Obține istoricul mișcărilor pentru o anumită gestiune.
     * GET /api/cash/movements/warehouse/?
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<CashMovementDTO>> getHistory(
            @PathVariable Integer warehouseId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        if (from == null) from = LocalDate.now().minusDays(30);
        if (to == null) to = LocalDate.now();

        LocalDateTime startDateTime = from.atStartOfDay();
        LocalDateTime endDateTime = to.atTime(LocalTime.MAX);

        List<CashMovement> entities = cashMovementRepository.findByWarehouseIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                warehouseId, startDateTime, endDateTime
        );

        List<CashMovementDTO> dtos = entities.stream()
            .map(e -> new CashMovementDTO(
                e.getId(),
                e.getCreatedAt(),
                e.getAmount(),
                e.getNote(),
                // Simplu, direct acces la getters
                e.getMovementType().getCode(),
                e.getMovementType().getLabel(),
                e.getUser().getFullName()
            ))
            .toList();

        return ResponseEntity.ok(dtos);
    }
}
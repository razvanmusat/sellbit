package com.sellbit.domain.cash.cashmovement;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
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
     * GET /api/cash/movements/warehouse/1
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<CashMovement>> getHistory(@PathVariable Integer warehouseId) {
        return ResponseEntity.ok(cashMovementRepository.findByWarehouseIdOrderByCreatedAtDesc(warehouseId));
    }
}
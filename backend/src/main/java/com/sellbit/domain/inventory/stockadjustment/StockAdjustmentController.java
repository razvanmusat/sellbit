package com.sellbit.domain.inventory.stockadjustment;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/adjustments")
@RequiredArgsConstructor
@Validated
public class StockAdjustmentController {

    private final StockAdjustmentService adjustmentService;

    /**
     * Creează o ajustare nouă.
     * Apelează logica de sincronizare FIFO și actualizarea stocului curent.
     */
    @Valid
    @PostMapping
    public ResponseEntity<Void> createAdjustment(@Valid @RequestBody StockAdjustmentDTOs.Create request) {
        adjustmentService.processAdjustment(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Raport ajustări între două date (pentru calendarele din React).
     */
    @GetMapping("/report")
    public ResponseEntity<List<StockAdjustmentDTOs.Response>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByDateRange(start, end));
    }

    /**
     * Istoricul ajustărilor pentru un anumit produs.
     * Util în pagina de "Detalii Produs" sau "Audit Stoc".
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<StockAdjustmentDTOs.Response>> getByProduct(@PathVariable Integer productId) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByProduct(productId));
    }

    /**
     * Raportul ajustărilor dintr-o gestiune specifică.
     * Util pentru verificarea pierderilor/spargerilor pe un anumit depozit.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<StockAdjustmentDTOs.Response>> getByWarehouse(@PathVariable Integer warehouseId) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByWarehouse(warehouseId));
    }
}
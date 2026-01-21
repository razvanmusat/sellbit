package com.sellbit.domain.inventory.stockadjustment;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    
     /* OPERAȚIONAL: Înregistrare Ajustare (Spargeri, Protocol, Alterate, Corecții).
        Casierul ('50') folosește asta pentru a scădea stocul când sparge ceva sau oferă protocol.
        Adminul ('100') folosește asta pentru corecții de inventar (plus/minus). */     
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping
    public ResponseEntity<Void> createAdjustment(@Valid @RequestBody StockAdjustmentDTOs.Create request) {
        adjustmentService.processAdjustment(request);
        return ResponseEntity.ok().build();
    }

    //Adminul verifică cât s-a pierdut (spargeri/alterate) într-o lună.
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report")
    public ResponseEntity<List<StockAdjustmentDTOs.Response>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByDateRange(start, end));
    }

    //AUDIT: Istoricul ajustărilor pentru un anumit produs.
    //Adminul investighează de ce un produs are mereu stocul pe minus (cine face ajustările?).
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<StockAdjustmentDTOs.Response>> getByProduct(@PathVariable Integer productId) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByProduct(productId));
    }
    
    /*Raportul ajustărilor dintr-o gestiune specifică.
    Util pentru verificarea pierderilor/spargerilor pe un anumit depozit.*/     
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<StockAdjustmentDTOs.Response>> getByWarehouse(@PathVariable Integer warehouseId) {
        return ResponseEntity.ok(adjustmentService.getAdjustmentsByWarehouse(warehouseId));
    }
}
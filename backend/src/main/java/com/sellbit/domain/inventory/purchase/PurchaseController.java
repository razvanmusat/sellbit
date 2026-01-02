package com.sellbit.domain.inventory.purchase;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/inventory/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    /**
     * Endpoint pentru recepția de marfă (Bulk Insert din React).
     */
    @PostMapping("/bulk")
    public ResponseEntity<Void> addPurchases(@Valid @RequestBody PurchaseDTOs.BulkCreate request) {
        purchaseService.processBulkPurchase(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Raport achiziții per depozit.
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<PurchaseDTOs.Response>> getByWarehouse(@PathVariable Integer warehouseId) {
        return ResponseEntity.ok(purchaseService.getPurchasesByWarehouse(warehouseId));
    }

    /**
     * Raport achiziții per produs (istoric loturi).
     */
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<PurchaseDTOs.Response>> getByProduct(@PathVariable Integer productId) {
        return ResponseEntity.ok(purchaseService.getPurchasesByProduct(productId));
    }

    /**
     * Filtrare pentru cele două calendare din React (Interval de timp).
     * Dacă start == end, va returna achizițiile din ziua respectivă.
     */
    @GetMapping("/report")
    public ResponseEntity<List<PurchaseDTOs.Response>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(purchaseService.getPurchasesByDateRange(start, end));
    }
    
    @GetMapping("/alerts/expiration")
    public ResponseEntity<List<PurchaseDTOs.ExpirationAlert>> getExpirationAlerts(
            @RequestParam(defaultValue = "15") int days) { 
        // Default 15 zile, dar poți trimite orice valoare din React/Script
        return ResponseEntity.ok(purchaseService.getExpirationAlerts(days));
    }
}
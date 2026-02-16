package com.sellbit.domain.inventory.purchase;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
    
    //Recepție marfă bulk. Permite sa introducem mai multe linii de recepție odată.
    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping("/bulk")
    public ResponseEntity<Void> addPurchases(@Valid @RequestBody PurchaseDTOs.BulkCreate request) {
        purchaseService.processBulkPurchase(request);
        return ResponseEntity.ok().build();
    }    

    // AUDIT: Istoric loturi per produs.
    // Adminul verifică prețurile de achiziție și FIFO pentru un anumit produs.    
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/product/{productId}")
    public ResponseEntity<List<PurchaseDTOs.Response>> getByProduct(
            @PathVariable Integer productId,
            @RequestParam Integer warehouseId) {
        return ResponseEntity.ok(purchaseService.getPurchasesByProduct(productId, warehouseId));
    }

    // RAPORT: Achiziții totale într-un interval de timp.
    // Folosit în dashboard-ul de admin pentru vizualizarea rulajului de marfă.
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report")
    public ResponseEntity<List<PurchaseDTOs.Response>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end,
            @RequestParam Integer warehouseId) {
        return ResponseEntity.ok(purchaseService.getPurchasesByDateRange(start, end, warehouseId));
    }

    // ALERTĂ: Produse care expiră curând. Setat implicit pe 15 zile.
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/alerts/expiration")
    public ResponseEntity<List<PurchaseDTOs.ExpirationAlert>> getExpirationAlerts(
            @RequestParam(defaultValue = "15") int days) { 
        // Default 15 zile, dar poți trimite orice valoare din React/Script
        return ResponseEntity.ok(purchaseService.getExpirationAlerts(days));
    }
}
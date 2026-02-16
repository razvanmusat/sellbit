package com.sellbit.domain.inventory.stockcurrent;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/stock-current")
@RequiredArgsConstructor
public class StockCurrentController {

    private final StockCurrentService stockCurrentService;

    // RAPORT: Stoc scriptic per depozit.
    // Adminul îl folosește pentru a vedea situația globală a mărfii dintr-o
    // gestiune.
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<StockCurrentDTOs.Response>> getStockByWarehouse(@PathVariable Integer warehouseId) {
        return ResponseEntity.ok(stockCurrentService.getStockByWarehouse(warehouseId));
    }

    // POS: Stoc live pentru produsul selectat.
    // Permite Casierului să vadă instant dacă mai are produsul pe stoc înainte de
    // a-l vinde.
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/warehouse/{warehouseId}/product/{productId}")
    public ResponseEntity<BigDecimal> getProductStockLive(
            @PathVariable Integer warehouseId,
            @PathVariable Integer productId) {

        return ResponseEntity.ok(stockCurrentService.getQuantity(warehouseId, productId));
    }

    // OPERAȚIONAL: Setare stoc faptic (Inventar).
    // Adminul suprascrie stocul scriptic cu cel numărat manual în depozit.
    // Ignoră valorile vechi și setează noua cantitate (Ex: de la 10 buc la 8 buc faptic).
    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping("/physical-stock")
    public ResponseEntity<Void> setPhysicalStock(@Valid @RequestBody StockCurrentDTOs.UpdateQuantity request) {
        stockCurrentService.setPhysicalStock(request);
        return ResponseEntity.ok().build();
    }
}
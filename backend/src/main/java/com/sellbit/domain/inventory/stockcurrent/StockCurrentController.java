package com.sellbit.domain.inventory.stockcurrent;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/inventory/stock-current")
@RequiredArgsConstructor
public class StockCurrentController {

    private final StockCurrentService stockCurrentService;

    
    //React îl folosește ca să afișeze stocul scriptic în tabelul de inventar.
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<List<StockCurrentDTOs.Response>> getStockByWarehouse(@PathVariable Integer warehouseId) {
        return ResponseEntity.ok(stockCurrentService.getStockByWarehouse(warehouseId));
    }
    
    /**
     * Endpoint pentru React (POS/Vânzare): 
     * Afișează stocul live pentru un singur produs când este selectat/scanat.
     */
    @GetMapping("/warehouse/{warehouseId}/product/{productId}")
    public ResponseEntity<BigDecimal> getProductStockLive(
            @PathVariable Integer warehouseId, 
            @PathVariable Integer productId) {
        
        return ResponseEntity.ok(stockCurrentService.getQuantity(warehouseId, productId));
    }
}
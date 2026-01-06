package com.sellbit.domain.cash.cashdrawer;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/cash/drawer")
@RequiredArgsConstructor
public class CashDrawerController {

    private final CashDrawerService cashDrawerService;

    /**
     * Returnează soldul live pentru o anumită gestiune.
     * GET /api/cash/drawer/warehouse/1
     */
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<BigDecimal> getBalance(@PathVariable Integer warehouseId) {
        CashDrawer drawer = cashDrawerService.getOrCreateDrawer(warehouseId);
        return ResponseEntity.ok(drawer.getCurrentBalance());
    }
}
package com.sellbit.domain.cash.cashdrawer;

import java.math.BigDecimal;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/cash/drawer")
@RequiredArgsConstructor
public class CashDrawerController {

    private final CashDrawerService cashDrawerService;

    /**
     * Returnează soldul live pentru o anumită gestiune.
     * GET /api/cash/drawer/warehouse/1
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/warehouse/{warehouseId}")
    public ResponseEntity<BigDecimal> getBalance(@PathVariable Integer warehouseId) {
        CashDrawer drawer = cashDrawerService.getOrCreateDrawer(warehouseId);
        return ResponseEntity.ok(drawer.getCurrentBalance());
    }
}
package com.sellbit.domain.cash.cashdrawer;

import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CashDrawerService {

    private final CashDrawerRepository cashDrawerRepository;
    private final WarehouseRepository warehouseRepository;

    /**
     * Obține sertarul pentru o gestiune. Dacă nu există, îl creează cu sold 0.
     */
    @Transactional
    public CashDrawer getOrCreateDrawer(Integer warehouseId) {
        return cashDrawerRepository.findByWarehouseId(warehouseId)
                .orElseGet(() -> {
                    Warehouse warehouse = warehouseRepository.findById(warehouseId)
                            .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));
                    
                    CashDrawer newDrawer = CashDrawer.builder()
                            .warehouse(warehouse)
                            .currentBalance(BigDecimal.ZERO)
                            .build();
                    
                    return cashDrawerRepository.save(newDrawer);
                });
    }

    /**
     * Actualizează soldul live (Update permanent).
     * Suma poate fi pozitivă (încasare) sau negativă (plată/retragere).
     */
    @Transactional
    public void updateBalance(Integer warehouseId, BigDecimal amount) {
        // 1. Luăm sertarul cu LOCK (pentru a preveni probleme de concurență)
        CashDrawer drawer = cashDrawerRepository.findByWarehouseIdForUpdate(warehouseId)
                .orElseGet(() -> getOrCreateDrawer(warehouseId));
        
        // 2. Calculăm noul sold PREZUMTIV
        BigDecimal newBalance = drawer.getCurrentBalance().add(amount);

        // 3. VALIDARE CRITICĂ: Nu poți avea bani negativi în sertar
        // Dacă newBalance < 0, aruncăm excepție
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("ERROR.CASH_DRAWER.INSUFFICIENT_FUNDS");
        }

        // 4. Dacă e ok, setăm noul sold
        drawer.setCurrentBalance(newBalance);
        
        // 5. Salvăm
        cashDrawerRepository.save(drawer);
    }
}
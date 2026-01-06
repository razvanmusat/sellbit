package com.sellbit.domain.cash.cashdrawer;

import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CashDrawerServiceTest {

    @Mock private CashDrawerRepository cashDrawerRepository;
    @Mock private WarehouseRepository warehouseRepository;

    @InjectMocks private CashDrawerService cashDrawerService;

    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        warehouse = Warehouse.builder()
                .id(1)
                .code("WH01")
                .name("Depozit Central")
                .isActive(true)
                .build();
    }

    @Test
    @DisplayName("getOrCreateDrawer - Succes: Returnează sertar existent")
    void getOrCreateDrawer_Exists() {
        CashDrawer existingDrawer = CashDrawer.builder()
                .warehouse(warehouse)
                .currentBalance(new BigDecimal("100.00"))
                .build();

        when(cashDrawerRepository.findByWarehouseId(1)).thenReturn(Optional.of(existingDrawer));

        CashDrawer result = cashDrawerService.getOrCreateDrawer(1);

        assertNotNull(result);
        assertEquals(new BigDecimal("100.00"), result.getCurrentBalance());
        verify(warehouseRepository, never()).findById(any());
    }

    @Test
    @DisplayName("getOrCreateDrawer - Succes: Creează sertar nou când nu există")
    void getOrCreateDrawer_CreateNew() {
        when(cashDrawerRepository.findByWarehouseId(1)).thenReturn(Optional.empty());
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(cashDrawerRepository.save(any(CashDrawer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CashDrawer result = cashDrawerService.getOrCreateDrawer(1);

        assertNotNull(result);
        assertEquals(BigDecimal.ZERO, result.getCurrentBalance());
        assertEquals(warehouse, result.getWarehouse());
        verify(cashDrawerRepository).save(any(CashDrawer.class));
    }

    @Test
    @DisplayName("getOrCreateDrawer - Fail: Warehouse inexistent")
    void getOrCreateDrawer_WarehouseNotFound() {
        when(cashDrawerRepository.findByWarehouseId(1)).thenReturn(Optional.empty());
        when(warehouseRepository.findById(1)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> cashDrawerService.getOrCreateDrawer(1));
        assertEquals("ERROR.WAREHOUSE.NOT_FOUND", ex.getMessage());
    }

    @Test
    @DisplayName("updateBalance - Succes: Adunare pozitivă cu Lock")
    void updateBalance_Positive() {
        CashDrawer drawer = CashDrawer.builder()
                .warehouse(warehouse)
                .currentBalance(new BigDecimal("50.00"))
                .build();

        // Verificăm că se apelează metoda cu LOCK (crucial pentru concurență)
        when(cashDrawerRepository.findByWarehouseIdForUpdate(1)).thenReturn(Optional.of(drawer));

        cashDrawerService.updateBalance(1, new BigDecimal("25.00"));

        assertEquals(new BigDecimal("75.00"), drawer.getCurrentBalance());
        verify(cashDrawerRepository).save(drawer);
    }

    @Test
    @DisplayName("updateBalance - Succes: Scădere (sumă negativă)")
    void updateBalance_Negative() {
        CashDrawer drawer = CashDrawer.builder()
                .warehouse(warehouse)
                .currentBalance(new BigDecimal("50.00"))
                .build();

        when(cashDrawerRepository.findByWarehouseIdForUpdate(1)).thenReturn(Optional.of(drawer));

        cashDrawerService.updateBalance(1, new BigDecimal("-10.00"));

        assertEquals(new BigDecimal("40.00"), drawer.getCurrentBalance());
        verify(cashDrawerRepository).save(drawer);
    }

    @Test
    @DisplayName("updateBalance - Succes: Inițializare și update dacă sertarul nu exista")
    void updateBalance_NewDrawerFirstTime() {
        CashDrawer newDrawer = CashDrawer.builder()
                .warehouse(warehouse)
                .currentBalance(BigDecimal.ZERO)
                .build();

        when(cashDrawerRepository.findByWarehouseIdForUpdate(1)).thenReturn(Optional.empty());
        when(cashDrawerRepository.findByWarehouseId(1)).thenReturn(Optional.empty()); // for getOrCreateDrawer
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(cashDrawerRepository.save(any(CashDrawer.class))).thenReturn(newDrawer);

        cashDrawerService.updateBalance(1, new BigDecimal("100.00"));

        // Verificăm că s-a încercat crearea și apoi salvarea noului sold
        verify(cashDrawerRepository, atLeastOnce()).save(any(CashDrawer.class));
    }
}
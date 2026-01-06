package com.sellbit.domain.inventory.warehouse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sellbit.domain.inventory.stockcurrent.StockCurrentRepository;

@ExtendWith(MockitoExtension.class)
class WarehouseServiceTest {

    @Mock private WarehouseRepository warehouseRepository;
    @Mock private StockCurrentRepository stockCurrentRepository;

    @InjectMocks
    private WarehouseService warehouseService;

    private Warehouse mockWarehouse;

    @BeforeEach
    void setUp() {
        mockWarehouse = Warehouse.builder()
                .id(1)
                .code("W1")
                .name("Depozit Central")
                .isActive(true)
                .build();
    }

    // --- 1. findAllActive ---
    @Test
    @DisplayName("findAllActive: Valid - returnează listă")
    void findAllActive_Valid() {
        when(warehouseRepository.findAllByIsActiveTrue()).thenReturn(List.of(mockWarehouse));
        List<WarehouseDTOs.Response> result = warehouseService.findAllActive();
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("findAllActive: Valid - listă goală")
    void findAllActive_Empty() {
        when(warehouseRepository.findAllByIsActiveTrue()).thenReturn(List.of());
        assertTrue(warehouseService.findAllActive().isEmpty());
    }

    // --- 2. findAllInactive ---
    @Test
    @DisplayName("findAllInactive: Valid - returnează listă")
    void findAllInactive_Valid() {
        mockWarehouse.setActive(false);
        when(warehouseRepository.findAllByIsActiveFalse()).thenReturn(List.of(mockWarehouse));
        assertEquals(1, warehouseService.findAllInactive().size());
    }

    @Test
    @DisplayName("findAllInactive: Valid - listă goală")
    void findAllInactive_Empty() {
        when(warehouseRepository.findAllByIsActiveFalse()).thenReturn(List.of());
        assertTrue(warehouseService.findAllInactive().isEmpty());
    }

    // --- 3. create ---
    @Test
    @DisplayName("create: Valid - salvare cu succes")
    void create_Valid() {
        WarehouseDTOs.Create dto = new WarehouseDTOs.Create("W2", "Depozit Nou");
        when(warehouseRepository.existsByCode("W2")).thenReturn(false);
        when(warehouseRepository.save(any())).thenReturn(mockWarehouse);

        assertNotNull(warehouseService.create(dto));
    }

    @Test
    @DisplayName("create: Invalid - cod deja existent")
    void create_Invalid_CodeExists() {
        WarehouseDTOs.Create dto = new WarehouseDTOs.Create("W1", "Nume");
        when(warehouseRepository.existsByCode("W1")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> warehouseService.create(dto));
        assertEquals("ERROR.WAREHOUSE.CODE_EXISTS", ex.getMessage());
    }

    // --- 4. update ---
    @Test
    @DisplayName("update: Valid - actualizare date")
    void update_Valid() {
        WarehouseDTOs.Update dto = new WarehouseDTOs.Update(1, "W1-MOD", "Nume Nou");
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(mockWarehouse));
        when(warehouseRepository.existsByCodeAndIdNot("W1-MOD", 1)).thenReturn(false);
        when(warehouseRepository.save(any())).thenReturn(mockWarehouse);

        assertNotNull(warehouseService.update(dto));
    }

    @Test
    @DisplayName("update: Invalid - ID inexistent")
    void update_Invalid_NotFound() {
        WarehouseDTOs.Update dto = new WarehouseDTOs.Update(99, "W99", "Nume");
        when(warehouseRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> warehouseService.update(dto));
    }

    // --- 5. toggleStatus ---
    @Test
    @DisplayName("toggleStatus: Valid - schimbare status reușită")
    void toggleStatus_Valid() {
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(mockWarehouse));
        // Nu are stoc, deci se poate dezactiva
        when(stockCurrentRepository.existsById_WarehouseIdAndQuantityGreaterThan(eq(1), any(BigDecimal.class)))
                .thenReturn(false);

        warehouseService.toggleStatus(1);
        verify(warehouseRepository).save(any());
    }

    @Test
    @DisplayName("toggleStatus: Invalid - are stoc (nu poate fi dezactivat)")
    void toggleStatus_Invalid_HasStock() {
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(mockWarehouse));
        when(stockCurrentRepository.existsById_WarehouseIdAndQuantityGreaterThan(eq(1), any(BigDecimal.class)))
                .thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> warehouseService.toggleStatus(1));
        assertEquals("ERROR.WAREHOUSE.HAS_STOCK", ex.getMessage());
    }
}
package com.sellbit.domain.inventory.stockcurrent;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StockCurrentServiceTest {

    @Mock private StockCurrentRepository stockCurrentRepository;
    @Mock private ProductRepository productRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private ProductComponentRepository productComponentRepository; // Adăugat pentru a fixa NPE

    @InjectMocks
    private StockCurrentService stockCurrentService;

    private Product mockProduct;
    private Warehouse mockWarehouse;

    @BeforeEach
    void setUp() {
        mockProduct = Product.builder().id(10).trackStock(true).name("P1").build();
        mockWarehouse = Warehouse.builder().id(1).name("W1").build();
        
        when(productRepository.findById(anyInt())).thenReturn(Optional.of(mockProduct));
        when(warehouseRepository.findById(anyInt())).thenReturn(Optional.of(mockWarehouse));
        when(warehouseRepository.existsById(anyInt())).thenReturn(true);
        
        // Actualizat pentru a folosi metoda cu Lock
        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(anyInt(), anyInt()))
                .thenReturn(Optional.of(new StockCurrent()));

        // Default stubbing pentru rețete (listă goală = produs simplu)
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(anyInt()))
                .thenReturn(new ArrayList<>());
    }

    // --- 1. setPhysicalStock ---

    @Test
    @DisplayName("setPhysicalStock: Valid - actualizare corectă")
    void setPhysicalStock_Valid() {
        Integer pId = 10;
        Integer wId = 1;
        BigDecimal qty = new BigDecimal("50.00");
        StockCurrentDTOs.UpdateQuantity request = new StockCurrentDTOs.UpdateQuantity(pId, wId, qty);
        
        when(productRepository.findById(pId)).thenReturn(Optional.of(mockProduct));

        stockCurrentService.setPhysicalStock(request);

        verify(stockCurrentRepository, times(1)).save(any(StockCurrent.class));
    }

    @Test
    @DisplayName("setPhysicalStock: Invalid - eroare cantitate negativă")
    void setPhysicalStock_Invalid() {
        Integer pId = 10;
        Integer wId = 1;
        BigDecimal negativeQty = new BigDecimal("-10.00");
        StockCurrentDTOs.UpdateQuantity request = new StockCurrentDTOs.UpdateQuantity(pId, wId, negativeQty);
        
        when(productRepository.findById(pId)).thenReturn(Optional.of(mockProduct));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            stockCurrentService.setPhysicalStock(request)
        );
        
        assertEquals("ERROR.STOCK.NEGATIVE_NOT_ALLOWED", ex.getMessage());
    }

    // --- 2. updateStockRelative ---

    @Test
    @DisplayName("updateStockRelative: Valid - adunare stoc")
    void updateStockRelative_Valid() {
        StockCurrent stock = new StockCurrent();
        stock.setQuantity(new BigDecimal("10.00")); // Plecăm de la 10
        
        // Sincronizat cu findById_WarehouseIdAndId_ProductIdForUpdate
        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(1, 10))
                .thenReturn(Optional.of(stock));

        // Scădem 1 bucată
        stockCurrentService.updateStockRelative(1, 10, new BigDecimal("-1.00"));

        assertEquals(0, new BigDecimal("9.00").compareTo(stock.getQuantity()));
        verify(stockCurrentRepository).save(stock);
    }

    @Test
    @DisplayName("updateStockRelative: Invalid - stoc insuficient")
    void updateStockRelative_Invalid() {
        StockCurrent stock = new StockCurrent();
        stock.setQuantity(BigDecimal.ONE);
        
        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(anyInt(), anyInt()))
                .thenReturn(Optional.of(stock));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            stockCurrentService.updateStockRelative(1, 10, new BigDecimal("-5.00"))
        );
        assertEquals("ERROR.STOCK.INSUFFICIENT_QUANTITY", ex.getMessage());
    }

    // --- 3. getStockByWarehouse ---

    @Test
    @DisplayName("getStockByWarehouse: Valid - listă")
    void getStockByWarehouse_Valid() {
        when(warehouseRepository.existsById(1)).thenReturn(true);
        assertNotNull(stockCurrentService.getStockByWarehouse(1));
    }

    @Test
    @DisplayName("getStockByWarehouse: Invalid - depozit inexistent")
    void getStockByWarehouse_Invalid() {
        when(warehouseRepository.existsById(99)).thenReturn(false);
        assertThrows(RuntimeException.class, () -> stockCurrentService.getStockByWarehouse(99));
    }

    // --- 4. syncStockFromReceiptChange ---

    @Test
    @DisplayName("syncStockFromReceiptChange: Valid - sincronizare")
    void syncStockFromReceiptChange_Valid() {
        StockCurrent stock = new StockCurrent();
        stock.setQuantity(new BigDecimal("10.00")); // Stoc inițial 10
        
        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(anyInt(), anyInt()))
                .thenReturn(Optional.of(stock));
        
        // Asigurăm că pentru produsul 10 returnăm listă goală de componente
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(10))
                .thenReturn(new ArrayList<>());

        // Adăugăm pe bon (old 0, new 1) -> Trebuie să scadă 1 din stoc (Rezultat 9)
        stockCurrentService.syncStockFromReceiptChange(1, 10, BigDecimal.ZERO, BigDecimal.ONE);

        verify(stockCurrentRepository).save(argThat(s -> s.getQuantity().compareTo(new BigDecimal("9.00")) == 0));
    }

    @Test
    @DisplayName("syncStockFromReceiptChange: Invalid - produs inexistent")
    void syncStockFromReceiptChange_Invalid() {
        when(productRepository.findById(99)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> 
            stockCurrentService.syncStockFromReceiptChange(1, 99, BigDecimal.ONE, BigDecimal.ZERO)
        );
    }

    // --- 5. getQuantity ---

    @Test
    @DisplayName("getQuantity: Valid - succes")
    void getQuantity_Valid() {
        StockCurrent stock = new StockCurrent();
        stock.setQuantity(new BigDecimal("12.34"));
        when(stockCurrentRepository.findById(any())).thenReturn(Optional.of(stock));

        BigDecimal res = stockCurrentService.getQuantity(1, 10);
        assertEquals(0, res.compareTo(new BigDecimal("12.34")));
    }

    @Test
    @DisplayName("getQuantity: Valid - returnează zero dacă e null")
    void getQuantity_Invalid() {
        when(stockCurrentRepository.findById(any())).thenReturn(Optional.empty());
        assertEquals(BigDecimal.ZERO, stockCurrentService.getQuantity(1, 10));
    }
}
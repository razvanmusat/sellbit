package com.sellbit.domain.inventory.purchase;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;

@ExtendWith(MockitoExtension.class)
class PurchaseServiceTest {

    @Mock private PurchaseRepository purchaseRepository;
    @Mock private ProductRepository productRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private UserRepository userRepository;
    @Mock private StockCurrentService stockCurrentService;

    @InjectMocks
    private PurchaseService purchaseService;

    private User mockUser;
    private Product mockProduct;
    private Warehouse mockWarehouse;

    @BeforeEach
    void setUp() {
        mockUser = User.builder().id(1).username("admin").build();
        mockProduct = Product.builder().id(10).name("Produs Test").build();
        mockWarehouse = Warehouse.builder().id(5).name("Depozit Central").build();
    }

    // --- TESTE: processBulkPurchase ---

    @Test
    @DisplayName("Succes: Procesare bulk purchase corectă și actualizare stoc")
    void processBulkPurchase_Success() {
        PurchaseDTOs.CreateItem item = new PurchaseDTOs.CreateItem(10, 5, new BigDecimal("10.000"), new BigDecimal("50.00"), null, "Nota test");
        PurchaseDTOs.BulkCreate request = new PurchaseDTOs.BulkCreate(1, List.of(item));

        when(userRepository.findById(1)).thenReturn(Optional.of(mockUser));
        when(productRepository.findById(10)).thenReturn(Optional.of(mockProduct));
        when(warehouseRepository.findById(5)).thenReturn(Optional.of(mockWarehouse));

        purchaseService.processBulkPurchase(request);

        verify(purchaseRepository, times(1)).save(any(Purchase.class));
        verify(stockCurrentService, times(1)).updateStockRelative(eq(5), eq(10), eq(new BigDecimal("10.000")));
    }

    @Test
    @DisplayName("Eroare: User inexistent la achiziție bulk")
    void processBulkPurchase_UserNotFound() {
        PurchaseDTOs.BulkCreate request = new PurchaseDTOs.BulkCreate(99, List.of());
        when(userRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> purchaseService.processBulkPurchase(request));
        assertEquals("ERROR.USER.NOT_FOUND", exception.getMessage());
    }

    @Test
    @DisplayName("Eroare: Produs inexistent în lista bulk")
    void processBulkPurchase_ProductNotFound() {
        PurchaseDTOs.CreateItem item = new PurchaseDTOs.CreateItem(999, 5, BigDecimal.ONE, BigDecimal.ONE, null, null);
        PurchaseDTOs.BulkCreate request = new PurchaseDTOs.BulkCreate(1, List.of(item));

        when(userRepository.findById(1)).thenReturn(Optional.of(mockUser));
        when(productRepository.findById(999)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> purchaseService.processBulkPurchase(request));
    }

    // --- TESTE: deductFromBatchesFIFO ---

    @Test
    @DisplayName("FIFO: Deducere corectă din loturi multiple (Scade 7 din 5+10)")
    void deductFromBatchesFIFO_MultipleBatches() {
        Purchase batch1 = Purchase.builder().id(1).remainingQuantity(new BigDecimal("5.000")).build();
        Purchase batch2 = Purchase.builder().id(2).remainingQuantity(new BigDecimal("10.000")).build();
        
        when(purchaseRepository.findActiveBatchesFIFO(5, 10)).thenReturn(List.of(batch1, batch2));

        purchaseService.deductFromBatchesFIFO(5, 10, new BigDecimal("7.000"));

        assertEquals(0, batch1.getRemainingQuantity().compareTo(BigDecimal.ZERO));
        assertEquals(0, batch2.getRemainingQuantity().compareTo(new BigDecimal("8.000")));
        verify(purchaseRepository, times(2)).save(any(Purchase.class));
    }

    @Test
    @DisplayName("Corner Case: Deducere cantitate ZERO (nu trebuie să interogheze DB)")
    void deductFromBatchesFIFO_ZeroQuantity() {
        purchaseService.deductFromBatchesFIFO(5, 10, BigDecimal.ZERO);

        verify(purchaseRepository, never()).findActiveBatchesFIFO(any(), any());
        verify(purchaseRepository, never()).save(any());
    }

    // --- TESTE: createVirtualReturnBatch ---

    @Test
    @DisplayName("Succes: Creare batch virtual (1970) pentru prioritate FIFO la retur")
    void createVirtualReturnBatch_Success() {
        when(productRepository.findById(10)).thenReturn(Optional.of(mockProduct));
        when(warehouseRepository.findById(5)).thenReturn(Optional.of(mockWarehouse));
        when(userRepository.findById(1)).thenReturn(Optional.of(mockUser));

        purchaseService.createVirtualReturnBatch(5, 10, 1, BigDecimal.TEN, "Test Reason");

        verify(purchaseRepository).save(argThat(p -> 
            p.getNote().contains("VIRTUAL_IN") && 
            p.getPurchasedAt().getYear() == 1970 &&
            p.getRemainingQuantity().equals(BigDecimal.TEN)
        ));
    }

    // --- TESTE: Rapoarte și Alerte ---

    @Test
    @DisplayName("Succes: Obținere achiziții după depozit")
    void getPurchasesByWarehouse_Success() {
        Purchase p = Purchase.builder()
                .product(mockProduct).warehouse(mockWarehouse)
                .quantity(BigDecimal.TEN).remainingQuantity(BigDecimal.TEN)
                .build();
        when(purchaseRepository.findByWarehouseId(5)).thenReturn(List.of(p));

        List<PurchaseDTOs.Response> result = purchaseService.getPurchasesByWarehouse(5);

        assertEquals(1, result.size());
        assertEquals("Produs Test", result.get(0).productName());
    }

    @Test
    @DisplayName("Succes: Verificare calcul zile până la expirare în alerte")
    void getExpirationAlerts_Success() {
        LocalDate expiry = LocalDate.now().plusDays(10);
        Purchase p = Purchase.builder()
                .id(100).product(mockProduct).warehouse(mockWarehouse)
                .remainingQuantity(BigDecimal.ONE)
                .expirationDate(expiry)
                .build();
        
        when(purchaseRepository.findExpiringBatches(any())).thenReturn(List.of(p));

        List<PurchaseDTOs.ExpirationAlert> alerts = purchaseService.getExpirationAlerts(15);

        assertFalse(alerts.isEmpty());
        assertEquals(10, alerts.get(0).daysUntilExpiration());
        assertEquals("Produs Test", alerts.get(0).productName());
    }

    @Test
    @DisplayName("Corner Case: Raport pentru produs fără istoric")
    void getPurchasesByProduct_Empty() {
        when(purchaseRepository.findByProductId(10)).thenReturn(List.of());
        List<PurchaseDTOs.Response> result = purchaseService.getPurchasesByProduct(10);
        assertTrue(result.isEmpty());
    }
}
package com.sellbit.domain.inventory.stockadjustment;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
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
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReason;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReasonRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StockAdjustmentServiceTest {

    @Mock private StockAdjustmentRepository adjustmentRepository;
    @Mock private ProductRepository productRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private UserRepository userRepository;
    @Mock private AdjustmentReasonRepository reasonRepository;
    @Mock private PurchaseService purchaseService;
    @Mock private StockCurrentService stockCurrentService;

    @InjectMocks
    private StockAdjustmentService adjustmentService;

    private Product mockProduct;
    private Warehouse mockWarehouse;
    private User mockUser;
    private AdjustmentReason mockReason;

    @BeforeEach
    void setUp() {
        mockProduct = Product.builder().id(10).name("P1").trackStock(true).build();
        mockWarehouse = Warehouse.builder().id(5).name("W1").build();
        mockUser = User.builder().id(1).username("admin").fullName("Admin User").build();
        mockReason = AdjustmentReason.builder().id(2).label("Pierdere").build();

        // Stubbings comune
        when(productRepository.findById(10)).thenReturn(Optional.of(mockProduct));
        when(warehouseRepository.findById(5)).thenReturn(Optional.of(mockWarehouse));
        when(userRepository.findById(1)).thenReturn(Optional.of(mockUser));
        when(reasonRepository.findById(2)).thenReturn(Optional.of(mockReason));
        when(warehouseRepository.existsById(1)).thenReturn(true);
        when(warehouseRepository.existsById(5)).thenReturn(true);
        when(productRepository.existsById(10)).thenReturn(true);
    }

    // --- METODA: processAdjustment ---

    @Test
    @DisplayName("processAdjustment: Succes scădere stoc (FIFO deduct)")
    void processAdjustment_Deduct_Success() {
        StockAdjustmentDTOs.Create dto = new StockAdjustmentDTOs.Create(10, 5, 1, 2, new BigDecimal("-5.000"), "Nota");
        when(stockCurrentService.getQuantity(5, 10)).thenReturn(new BigDecimal("10.000"));

        adjustmentService.processAdjustment(dto);

        verify(adjustmentRepository).save(any());
        verify(purchaseService).deductFromBatchesFEFO(eq(5), eq(10), eq(new BigDecimal("5.000")));
        verify(stockCurrentService).updateStockRelative(eq(5), eq(10), eq(new BigDecimal("-5.000")));
    }

    @Test
    @DisplayName("processAdjustment: Succes adăugare stoc (Virtual Batch)")
    void processAdjustment_Add_Success() {
        StockAdjustmentDTOs.Create dto = new StockAdjustmentDTOs.Create(10, 5, 1, 2, new BigDecimal("5.000"), "Nota");

        adjustmentService.processAdjustment(dto);

        verify(purchaseService).createVirtualReturnBatch(eq(5), eq(10), eq(1), eq(new BigDecimal("5.000")), anyString());
        verify(stockCurrentService).updateStockRelative(eq(5), eq(10), eq(new BigDecimal("5.000")));
    }

    @Test
    @DisplayName("processAdjustment: Eroare - Cantitate Zero")
    void processAdjustment_ZeroQty_Error() {
        StockAdjustmentDTOs.Create dto = new StockAdjustmentDTOs.Create(10, 5, 1, 2, BigDecimal.ZERO, "Nota");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> adjustmentService.processAdjustment(dto));
        assertEquals("ERROR.ADJUSTMENT.INVALID_QUANTITY", ex.getMessage());
    }

    @Test
    @DisplayName("processAdjustment: Eroare - Stoc Insuficient")
    void processAdjustment_NoStock_Error() {
        StockAdjustmentDTOs.Create dto = new StockAdjustmentDTOs.Create(10, 5, 1, 2, new BigDecimal("-100.000"), "Nota");
        when(stockCurrentService.getQuantity(5, 10)).thenReturn(new BigDecimal("10.000"));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> adjustmentService.processAdjustment(dto));
        assertEquals("ERROR.ADJUSTMENT.INSUFFICIENT_STOCK", ex.getMessage());
    }

    // --- METODA: getAdjustmentsByProduct ---

    @Test
    @DisplayName("getByProduct: Succes returnare listă")
    void getByProduct_Success() {
        when(productRepository.existsById(10)).thenReturn(true);
        StockAdjustment adj = StockAdjustment.builder()
                .product(mockProduct).warehouse(mockWarehouse).user(mockUser).reason(mockReason)
                .quantityChange(BigDecimal.ONE).adjustedAt(LocalDateTime.now()).build();
        
        when(adjustmentRepository.findByProductIdOrderByAdjustedAtDesc(10)).thenReturn(List.of(adj));

        List<StockAdjustmentDTOs.Response> result = adjustmentService.getAdjustmentsByProduct(10);
        assertFalse(result.isEmpty());
        assertEquals("P1", result.get(0).productName());
    }

    @Test
    @DisplayName("getByProduct: Eroare - Produs Inexistent")
    void getByProduct_NotFound() {
        when(productRepository.existsById(99)).thenReturn(false);
        assertThrows(RuntimeException.class, () -> adjustmentService.getAdjustmentsByProduct(99));
    }

    // --- METODA: getAdjustmentsByDateRange ---
    @Test
    @DisplayName("getByDateRange: Succes apel repository")
    void getByDateRange_Success() {
        LocalDate now = LocalDate.now();
        when(adjustmentRepository.findByWarehouseIdAndAdjustedAtBetweenOrderByAdjustedAtDesc(eq(1), any(), any()))
                .thenReturn(List.of());
        
        adjustmentService.getAdjustmentsByDateRange(1, now, now);
        
        verify(adjustmentRepository).findByWarehouseIdAndAdjustedAtBetweenOrderByAdjustedAtDesc(eq(1), any(), any());
    }

    @Test
    @DisplayName("getByDateRange: Corner Case - Rezultate goale")
    void getByDateRange_Empty() {
        when(adjustmentRepository.findByWarehouseIdAndAdjustedAtBetweenOrderByAdjustedAtDesc(eq(1), any(), any())).thenReturn(List.of());
        List<StockAdjustmentDTOs.Response> result = adjustmentService.getAdjustmentsByDateRange(1, LocalDate.now(), LocalDate.now());
        assertTrue(result.isEmpty());
    }
}

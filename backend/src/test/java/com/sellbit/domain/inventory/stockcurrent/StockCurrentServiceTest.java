package com.sellbit.domain.inventory.stockcurrent;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.util.ArrayList;
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
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockadjustment.StockAdjustment;
import com.sellbit.domain.inventory.stockadjustment.StockAdjustmentRepository;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReason;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReasonRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StockCurrentServiceTest {

    @Mock
    private StockCurrentRepository stockCurrentRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private WarehouseRepository warehouseRepository;
    @Mock
    private ProductComponentRepository productComponentRepository;
    @Mock
    private StockAdjustmentRepository adjustmentRepository;
    @Mock
    private AdjustmentReasonRepository reasonRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private PurchaseService purchaseService;

    @InjectMocks
    private StockCurrentService stockCurrentService;

    private Product mockProduct;
    private Warehouse mockWarehouse;
    private User mockAdmin;
    private AdjustmentReason mockReason;

    @BeforeEach
    void setUp() {
        mockProduct = Product.builder().id(10).trackStock(true).name("P1").build();
        mockWarehouse = Warehouse.builder().id(1).name("W1").build();
        mockAdmin = User.builder().id(1).username("admin").build();
        mockReason = AdjustmentReason.builder().id(1).code("INVENTORY_COUNT").label("Inventar").build();

        // Stubbing pentru ProductRepository (folosit getReferenceById și findById)
        when(productRepository.getReferenceById(10)).thenReturn(mockProduct);
        when(productRepository.findById(10)).thenReturn(Optional.of(mockProduct));

        when(warehouseRepository.findById(anyInt())).thenReturn(Optional.of(mockWarehouse));
        when(warehouseRepository.existsById(anyInt())).thenReturn(true);

        // Stubbing pentru motive și admin
        when(reasonRepository.findByCode("INVENTORY_COUNT")).thenReturn(Optional.of(mockReason));
        when(userRepository.findByRoleCodeAndIsActiveTrue("ADMIN")).thenReturn(List.of(mockAdmin));

        // Default listă componente goală
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(anyInt())).thenReturn(new ArrayList<>());
    }

    // --- 1. setPhysicalStock ---

    @Test
    @DisplayName("setPhysicalStock: Creștere stoc - verifică apel FIFO și Audit")
    void setPhysicalStock_Increase() {
        // Mock stoc actual = 10
        StockCurrent stock = StockCurrent.builder()
                .id(new StockCurrentId(1, 10))
                .warehouse(mockWarehouse).product(mockProduct).quantity(new BigDecimal("10.00")).build();

        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(1, 10)).thenReturn(Optional.of(stock));

        // Noua cantitate 15 (Diferență +5)
        StockCurrentDTOs.UpdateQuantity request = new StockCurrentDTOs.UpdateQuantity(
                1, // warehouseId
                "Plus", // reason
                List.of(new StockCurrentDTOs.UpdateItem(10, new BigDecimal("15.00"))) // items (productId, newQuantity)
        );

        stockCurrentService.setPhysicalStock(request);

        verify(stockCurrentRepository).save(any(StockCurrent.class));
        verify(adjustmentRepository).save(any(StockAdjustment.class));
        // Trebuie să apeleze createVirtualReturnBatch pentru plus
        verify(purchaseService).createVirtualReturnBatch(eq(1), eq(10), eq(1), eq(new BigDecimal("5.00")), anyString());
    }

    @Test
    @DisplayName("setPhysicalStock: Scădere stoc - verifică apel FIFO")
    void setPhysicalStock_Decrease() {
        // Mock stoc actual = 10
        StockCurrent stock = StockCurrent.builder()
                .id(new StockCurrentId(1, 10))
                .warehouse(mockWarehouse).product(mockProduct).quantity(new BigDecimal("10.00")).build();

        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(1, 10)).thenReturn(Optional.of(stock));

        // Noua cantitate 4 (Diferență -6)
        StockCurrentDTOs.UpdateQuantity request = new StockCurrentDTOs.UpdateQuantity(
                1,
                "Minus",
                List.of(new StockCurrentDTOs.UpdateItem(10, new BigDecimal("4.00"))));

        stockCurrentService.setPhysicalStock(request);

        // Trebuie să apeleze deductFromBatchesFIFO pentru minus (cu valoarea absolută
        // 6)
        verify(purchaseService).deductFromBatchesFIFO(eq(1), eq(10),
                argThat(val -> val.compareTo(new BigDecimal("6.00")) == 0));
    }

    // --- 2. updateStockRelative ---

    @Test
    @DisplayName("updateStockRelative: Valid - adunare stoc")
    void updateStockRelative_Valid() {
        StockCurrent stock = StockCurrent.builder()
                .id(new StockCurrentId(1, 10))
                .quantity(new BigDecimal("10.00")).build();

        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(1, 10)).thenReturn(Optional.of(stock));

        stockCurrentService.updateStockRelative(1, 10, new BigDecimal("-1.00"));

        assertEquals(0, new BigDecimal("9.00").compareTo(stock.getQuantity()));
        verify(stockCurrentRepository).save(stock);
    }

    @Test
    @DisplayName("updateStockRelative: Invalid - stoc insuficient")
    void updateStockRelative_Invalid() {
        StockCurrent stock = StockCurrent.builder().quantity(BigDecimal.ONE).build();
        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(anyInt(), anyInt()))
                .thenReturn(Optional.of(stock));

        assertThrows(RuntimeException.class,
                () -> stockCurrentService.updateStockRelative(1, 10, new BigDecimal("-5.00")));
    }

    // --- 3. getStockByWarehouse ---

    @Test
    void getStockByWarehouse_Valid() {
        when(warehouseRepository.existsById(1)).thenReturn(true);
        assertNotNull(stockCurrentService.getStockByWarehouse(1));
    }

    @Test
    void getStockByWarehouse_NotFound() {
        when(warehouseRepository.existsById(99)).thenReturn(false);
        assertThrows(RuntimeException.class, () -> stockCurrentService.getStockByWarehouse(99));
    }

    // --- 4. syncStockFromReceiptChange ---

    @Test
    void syncStockFromReceiptChange_Valid() {
        StockCurrent stock = StockCurrent.builder()
                .id(new StockCurrentId(1, 10))
                .quantity(new BigDecimal("10.00")).build();

        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(anyInt(), anyInt()))
                .thenReturn(Optional.of(stock));

        stockCurrentService.syncStockFromReceiptChange(1, 10, BigDecimal.ZERO, BigDecimal.ONE);

        verify(stockCurrentRepository).save(argThat(s -> s.getQuantity().compareTo(new BigDecimal("9.00")) == 0));
    }

    // --- 5. getQuantity ---

    @Test
    void getQuantity_Valid() {
        StockCurrent stock = StockCurrent.builder().quantity(new BigDecimal("12.34")).build();
        when(stockCurrentRepository.findById(any(StockCurrentId.class))).thenReturn(Optional.of(stock));

        BigDecimal res = stockCurrentService.getQuantity(1, 10);
        assertEquals(0, res.compareTo(new BigDecimal("12.34")));
    }

    @Test
    @DisplayName("setPhysicalStock: BULK - Un produs pe Plus, unul pe Minus")
    void setPhysicalStock_BulkMixed() {
        // 1. Setup al doilea produs (ID 11)
        Product p2 = Product.builder().id(11).trackStock(true).name("P2").build();
        when(productRepository.findById(11)).thenReturn(Optional.of(p2));
        when(productRepository.getReferenceById(11)).thenReturn(p2); // Pt consistență

        // Mock stocuri inițiale
        // P1 (ID 10): Are 10, setăm 15 (+5)
        StockCurrent s1 = StockCurrent.builder().id(new StockCurrentId(1, 10))
                .warehouse(mockWarehouse).product(mockProduct).quantity(new BigDecimal("10.00")).build();
        
        // P2 (ID 11): Are 20, setăm 18 (-2)
        StockCurrent s2 = StockCurrent.builder().id(new StockCurrentId(1, 11))
                .warehouse(mockWarehouse).product(p2).quantity(new BigDecimal("20.00")).build();

        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(1, 10)).thenReturn(Optional.of(s1));
        when(stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(1, 11)).thenReturn(Optional.of(s2));

        // 2. Request cu LISTĂ (2 itemi)
        StockCurrentDTOs.UpdateQuantity request = new StockCurrentDTOs.UpdateQuantity(
                1, 
                "Inventar Mix",
                List.of(
                    new StockCurrentDTOs.UpdateItem(10, new BigDecimal("15.00")), // +5
                    new StockCurrentDTOs.UpdateItem(11, new BigDecimal("18.00"))  // -2
                )
        );

        // 3. Execuție
        stockCurrentService.setPhysicalStock(request);

        // 4. Verificări
        // Verify save a fost apelat de 2 ori (pt fiecare stoc)
        verify(stockCurrentRepository, times(2)).save(any(StockCurrent.class));
        
        // Verify audit a fost apelat de 2 ori
        verify(adjustmentRepository, times(2)).save(any(StockAdjustment.class));

        // Verify logica FIFO/Return
        // Pt ID 10 (+5) -> Virtual Return
        verify(purchaseService).createVirtualReturnBatch(eq(1), eq(10), eq(1), eq(new BigDecimal("5.00")), anyString());
        // Pt ID 11 (-2) -> Deduct FIFO
        verify(purchaseService).deductFromBatchesFIFO(eq(1), eq(11), eq(new BigDecimal("2.00")));
    }
}
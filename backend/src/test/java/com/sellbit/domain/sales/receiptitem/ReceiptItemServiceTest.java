package com.sellbit.domain.sales.receiptitem;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptDTOs;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceiptItemServiceTest {

    @Mock private ReceiptItemRepository itemRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private ProductRepository productRepository;
    @Mock private StockCurrentService stockCurrentService;
    @Mock private ReceiptService receiptService;
    @Mock private PurchaseService purchaseService;

    @InjectMocks
    private ReceiptItemService receiptItemService;

    private Receipt receipt;
    private Product product;
    private ReceiptStatus openStatus;

    @BeforeEach
    void setUp() {
        openStatus = new ReceiptStatus();
        openStatus.setCode("OPEN");

        Warehouse warehouse = new Warehouse();
        warehouse.setId(1);

        receipt = new Receipt();
        receipt.setId(100);
        receipt.setStatus(openStatus);
        receipt.setWarehouse(warehouse);
        receipt.setItems(new ArrayList<>());

        VatRate vat = VatRate.builder().rate(new BigDecimal("19.00")).build();
        product = Product.builder()
                .id(50)
                .name("Test Product")
                .salePrice(new BigDecimal("119.00"))
                .trackStock(true)
                .vatRate(vat)
                .build();
    }

    @Test
    @DisplayName("addOrUpdateItem - Succes: Adăugare produs nou")
    void addOrUpdateItem_Success_NewItem() {
        // Arrange
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(purchaseService.getCurrentFIFOPurchasePrice(1, 50)).thenReturn(new BigDecimal("50.00"));
        
        // Mock pentru receiptService.mapToResponse deoarece este returnat de metodă
        ReceiptDTOs.Response expectedResponse = mock(ReceiptDTOs.Response.class);
        when(receiptService.mapToResponse(any(Receipt.class))).thenReturn(expectedResponse);

        // Act
        var result = receiptItemService.addOrUpdateItem(100, 50, new BigDecimal("2.000"));

        // Assert
        assertNotNull(result);
        verify(itemRepository).save(any(ReceiptItem.class));
        // Verificăm sincronizarea stocului: oldQty = 0, newQty = 2
        verify(stockCurrentService).syncStockFromReceiptChange(eq(1), eq(50), eq(BigDecimal.ZERO), eq(new BigDecimal("2.000")));
        verify(receiptService).updateReceiptTotals(100);
    }

    @Test
    @DisplayName("addOrUpdateItem - Eroare: Bonul nu are status OPEN")
    void addOrUpdateItem_Fail_StatusNotOpen() {
        ReceiptStatus closedStatus = new ReceiptStatus();
        closedStatus.setCode("CLOSED");
        receipt.setStatus(closedStatus);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            receiptItemService.addOrUpdateItem(100, 50, BigDecimal.ONE));
        
        assertEquals("ERROR.RECEIPT.NOT_OPEN", ex.getMessage());
    }

    @Test
    @DisplayName("removeItem - Succes: Ștergere linie și sync stoc")
    void removeItem_Success() {
        // Arrange
        ReceiptItem item = ReceiptItem.builder()
                .id(500)
                .receipt(receipt)
                .product(product)
                .quantity(new BigDecimal("1.000"))
                .build();

        when(itemRepository.findById(500)).thenReturn(Optional.of(item));
        
        ReceiptDTOs.Response expectedResponse = mock(ReceiptDTOs.Response.class);
        when(receiptService.mapToResponse(any(Receipt.class))).thenReturn(expectedResponse);

        // Act
        var result = receiptItemService.removeItem(500);

        // Assert
        assertNotNull(result);
        // Sync invers: de la quantity 1.000 la 0
        verify(stockCurrentService).syncStockFromReceiptChange(eq(1), eq(50), eq(new BigDecimal("1.000")), eq(BigDecimal.ZERO));
        verify(itemRepository).delete(item);
        verify(receiptService).updateReceiptTotals(100);
    }

    @Test
    @DisplayName("getItemsByReceipt - Succes: Mapare corectă")
    void getItemsByReceipt_Success() {
        // Arrange
        ReceiptItem item = ReceiptItem.builder()
                .id(1)
                .product(product)
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("100.00"))
                .vatRate(new BigDecimal("19.00"))
                .lineTotal(new BigDecimal("100.00"))
                .netTotal(new BigDecimal("84.03"))
                .vatTotal(new BigDecimal("15.97"))
                .build();

        when(itemRepository.findByReceiptId(100)).thenReturn(List.of(item));

        // Act
        var result = receiptItemService.getItemsByReceipt(100);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Test Product", result.get(0).productName());
        // Verificăm BigDecimal cu compareTo pentru a ignora scale-ul (ex: 100.0 vs 100.00)
        assertEquals(0, new BigDecimal("100.00").compareTo(result.get(0).lineTotal()));
    }

    // --- Teste getProductsQuantityReport ---

    @Test
    @DisplayName("getProductsQuantityReport - Succes: Returnează lista agregată din repository")
    void getProductsQuantityReport_Success() {
        // Arrange
        java.time.LocalDateTime start = java.time.LocalDateTime.now().minusDays(1);
        java.time.LocalDateTime end = java.time.LocalDateTime.now();
        List<Integer> productIds = List.of(50, 51);
        
        var mockReport = new ReceiptItemDTO.QuantityReportResponse(
                "Test Product", new BigDecimal("10.000"), new BigDecimal("1190.00"));
        
        when(itemRepository.getProductsQuantityReport(start, end, productIds))
                .thenReturn(List.of(mockReport));

        // Act
        List<ReceiptItemDTO.QuantityReportResponse> result = 
                receiptItemService.getProductsQuantityReport(start, end, productIds);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Test Product", result.get(0).productName());
        assertEquals(0, new BigDecimal("10.000").compareTo(result.get(0).totalQuantity()));
        verify(itemRepository).getProductsQuantityReport(start, end, productIds);
    }

    @Test
    @DisplayName("getProductsQuantityReport - Succes: Funcționează cu productIds null")
    void getProductsQuantityReport_NullIds_Success() {
        // Arrange
        java.time.LocalDateTime start = java.time.LocalDateTime.now();
        java.time.LocalDateTime end = java.time.LocalDateTime.now();
        
        when(itemRepository.getProductsQuantityReport(any(), any(), isNull()))
                .thenReturn(new ArrayList<>());

        // Act
        var result = receiptItemService.getProductsQuantityReport(start, end, null);

        // Assert
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(itemRepository).getProductsQuantityReport(start, end, null);
    }

    @Test
    @DisplayName("getProductsQuantityReport - Caz Limită: Repository returnează listă goală pentru interval fără vânzări")
    void getProductsQuantityReport_EmptyResult_ReturnsEmptyList() {
        // Arrange
        when(itemRepository.getProductsQuantityReport(any(), any(), any()))
                .thenReturn(List.of());

        // Act
        var result = receiptItemService.getProductsQuantityReport(java.time.LocalDateTime.now(), java.time.LocalDateTime.now(), null);

        // Assert
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("getProductsQuantityReport - Caz Limită: Verifică dacă datele sunt pasate corect către repository")
    void getProductsQuantityReport_PassesCorrectArguments() {
        // Arrange
        java.time.LocalDateTime start = java.time.LocalDateTime.of(2026, 1, 1, 0, 0);
        java.time.LocalDateTime end = java.time.LocalDateTime.of(2026, 1, 31, 23, 59);
        
        // Act
        receiptItemService.getProductsQuantityReport(start, end, null);

        // Assert
        // Verificăm că service-ul nu modifică datele înainte de a le trimite la repo
        verify(itemRepository).getProductsQuantityReport(eq(start), eq(end), isNull());
    }
}
package com.sellbit.domain.sales.receiptitem;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.productcomposite.ProductComponent;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.config.InsufficientStockException;
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
import java.util.Collections;
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
    @Mock private ProductComponentRepository productComponentRepository;
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
                .trackStock(true) // Important pentru testele de stoc
                .vatRate(vat)
                .build();
    }

    // --- TESTE PRINCIPALE ---

    @Test
    @DisplayName("addOrUpdateItem - Succes: Adăugare produs nou")
    void addOrUpdateItem_Success_NewItem() {
        // Arrange
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        
        // Returnăm listă goală => Produs simplu
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(50))
                .thenReturn(Collections.emptyList());

        when(purchaseService.getCurrentFIFOPurchasePrice(1, 50)).thenReturn(new BigDecimal("50.00"));
        
        // CORECTAT: Folosim getQuantity
        when(stockCurrentService.getQuantity(1, 50)).thenReturn(new BigDecimal("10.000"));
        
        ReceiptDTOs.Response expectedResponse = mock(ReceiptDTOs.Response.class);
        when(receiptService.mapToResponse(any(Receipt.class))).thenReturn(expectedResponse);

        // Act
        var result = receiptItemService.addOrUpdateItem(100, 50, new BigDecimal("2.000"));

        // Assert
        assertNotNull(result);
        verify(itemRepository).save(any(ReceiptItem.class));
        verify(stockCurrentService).syncStockFromReceiptChange(eq(1), eq(50), eq(BigDecimal.ZERO), eq(new BigDecimal("2.000")));
        verify(receiptService).updateReceiptTotals(100);
    }

    @Test
    @DisplayName("addOrUpdateItem - Eroare: Stoc Insuficient (Produs Simplu)")
    void addOrUpdateItem_Fail_InsufficientStock_SimpleProduct() {
        // Arrange
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(50))
                .thenReturn(Collections.emptyList());

        // CORECTAT: getQuantity returnează stoc mic (1)
        when(stockCurrentService.getQuantity(1, 50)).thenReturn(new BigDecimal("1.000"));

        // Act & Assert (Vrem 5 bucăți)
        InsufficientStockException ex = assertThrows(InsufficientStockException.class, () -> 
            receiptItemService.addOrUpdateItem(100, 50, new BigDecimal("5.000")));
        
        // CORECTAT: Folosim getProductNames()
        assertTrue(ex.getProductNames().contains("Test Product"));
        verify(itemRepository, never()).save(any());
    }

    // --- TESTE SUPLIMENTARE (Corner Cases) ---

    @Test
    @DisplayName("addOrUpdateItem - Eroare: Stoc Insuficient (Produs Compus / Meniu)")
    void addOrUpdateItem_Fail_InsufficientStock_CompositeProduct() {
        // Arrange
        Product menuProduct = Product.builder().id(60).name("Burger Menu").trackStock(true).build();
        Product ingredient = Product.builder().id(61).name("Meat Patty").trackStock(true).build();

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(productRepository.findById(60)).thenReturn(Optional.of(menuProduct));

        // 1 Meniu = 2 x Carne
        ProductComponent comp = new ProductComponent();
        comp.setChildProduct(ingredient);
        comp.setQuantity(new BigDecimal("2.000"));

        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(60))
                .thenReturn(List.of(comp));

        // Vrem 2 Meniuri => Necesar 4 Carne. Stoc Carne: 3 => Insuficient
        // CORECTAT: getQuantity pe ingredient
        when(stockCurrentService.getQuantity(1, 61)).thenReturn(new BigDecimal("3.000"));

        // Act & Assert
        InsufficientStockException ex = assertThrows(InsufficientStockException.class, () -> 
            receiptItemService.addOrUpdateItem(100, 60, new BigDecimal("2.000")));

        // CORECTAT: getProductNames()
        assertTrue(ex.getProductNames().contains("Meat Patty"));
    }

    @Test
    @DisplayName("addOrUpdateItem - Eroare: Produsul nu există")
    void addOrUpdateItem_Fail_ProductNotFound() {
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(productRepository.findById(999)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> 
            receiptItemService.addOrUpdateItem(100, 999, BigDecimal.ONE));

        assertEquals("ERROR.PRODUCT.NOT_FOUND", ex.getMessage());
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
        receipt.getItems().add(item);

        when(itemRepository.findById(500)).thenReturn(Optional.of(item));
        
        ReceiptDTOs.Response expectedResponse = mock(ReceiptDTOs.Response.class);
        when(receiptService.mapToResponse(any(Receipt.class))).thenReturn(expectedResponse);

        // Act
        var result = receiptItemService.removeItem(500);

        // Assert
        assertNotNull(result);
        verify(stockCurrentService).syncStockFromReceiptChange(eq(1), eq(50), eq(new BigDecimal("1.000")), eq(BigDecimal.ZERO));
        verify(itemRepository).delete(item);
        verify(receiptService).updateReceiptTotals(100);
    }

    @Test
    @DisplayName("getItemsByReceipt - Succes: Mapare corectă")
    void getItemsByReceipt_Success() {
        ReceiptItem item = ReceiptItem.builder().id(1).product(product)
                .quantity(BigDecimal.ONE).unitPrice(new BigDecimal("100.00"))
                .vatRate(new BigDecimal("19.00")).lineTotal(new BigDecimal("100.00"))
                .netTotal(new BigDecimal("84.03")).vatTotal(new BigDecimal("15.97"))
                .build();

        when(itemRepository.findByReceiptIdOrderByIdAsc(100)).thenReturn(List.of(item));

        var result = receiptItemService.getItemsByReceipt(100);

        assertEquals(1, result.size());
        assertEquals("Test Product", result.get(0).productName());
        assertEquals(0, new BigDecimal("100.00").compareTo(result.get(0).lineTotal()));
    }

    // --- TESTE REPORTING ---

    @Test
    @DisplayName("getProductsQuantityReport - Succes: Returnează lista agregată")
    void getProductsQuantityReport_Success() {
        java.time.LocalDateTime start = java.time.LocalDateTime.now();
        java.time.LocalDateTime end = java.time.LocalDateTime.now();
        List<Integer> productIds = List.of(50);
        
        var mockReport = new ReceiptItemDTO.QuantityReportResponse(
                "Test Product", new BigDecimal("10.000"), new BigDecimal("1190.00"));
        
        // MODIFICAT: Acceptă 4 argumente (start, end, productIds, warehouseId)
        when(itemRepository.getProductsQuantityReport(start, end, productIds, null))
                .thenReturn(List.of(mockReport));

        // MODIFICAT: Apel cu 4 argumente
        var result = receiptItemService.getProductsQuantityReport(start, end, productIds, null);

        assertEquals(1, result.size());
        assertEquals("Test Product", result.get(0).productName());
    }

    @Test
    @DisplayName("getProductsQuantityReport - Succes: Funcționează cu productIds null")
    void getProductsQuantityReport_NullIds_Success() {
        java.time.LocalDateTime start = java.time.LocalDateTime.now();
        java.time.LocalDateTime end = java.time.LocalDateTime.now();
        
        // MODIFICAT: Acceptă 4 argumente
        when(itemRepository.getProductsQuantityReport(any(), any(), isNull(), any()))
                .thenReturn(new ArrayList<>());

        // MODIFICAT: Apel cu 4 argumente
        var result = receiptItemService.getProductsQuantityReport(start, end, null, null);

        assertNotNull(result);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("getProductsQuantityReport - Caz Limită: Repository returnează listă goală")
    void getProductsQuantityReport_EmptyResult() {
        // MODIFICAT: Acceptă 4 argumente
        when(itemRepository.getProductsQuantityReport(any(), any(), any(), any()))
                .thenReturn(List.of());

        // MODIFICAT: Apel cu 4 argumente
        var result = receiptItemService.getProductsQuantityReport(java.time.LocalDateTime.now(), java.time.LocalDateTime.now(), null, null);

        assertTrue(result.isEmpty());
    }
}
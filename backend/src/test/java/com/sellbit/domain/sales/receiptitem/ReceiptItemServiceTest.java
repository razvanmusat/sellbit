package com.sellbit.domain.sales.receiptitem;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.sales.receipt.Receipt;
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

    // --- addOrUpdateItem ---

    @Test
    @DisplayName("addOrUpdateItem - Succes: Adăugare produs nou (cu trackStock=true)")
    void addOrUpdateItem_Success_NewItem() {
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(purchaseService.getCurrentFIFOPurchasePrice(1, 50)).thenReturn(new BigDecimal("50.00"));

        receiptItemService.addOrUpdateItem(100, 50, new BigDecimal("2.000"));

        verify(itemRepository).save(any(ReceiptItem.class));
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

        assertThrows(RuntimeException.class, () -> 
            receiptItemService.addOrUpdateItem(100, 50, BigDecimal.ONE));
    }

    // --- removeItem ---

    @Test
    @DisplayName("removeItem - Succes: Ștergere linie și sync stoc invers")
    void removeItem_Success() {
        ReceiptItem item = ReceiptItem.builder()
                .id(500)
                .receipt(receipt)
                .product(product)
                .quantity(new BigDecimal("1.000"))
                .build();

        when(itemRepository.findById(500)).thenReturn(Optional.of(item));

        receiptItemService.removeItem(500);

        // Verificăm că pune cantitatea înapoi în stoc (oldQty=1, newQty=0)
        verify(stockCurrentService).syncStockFromReceiptChange(eq(1), eq(50), eq(new BigDecimal("1.000")), eq(BigDecimal.ZERO));
        verify(itemRepository).delete(item);
    }

    @Test
    @DisplayName("removeItem - Eroare: Item negăsit")
    void removeItem_Fail_NotFound() {
        when(itemRepository.findById(999)).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> receiptItemService.removeItem(999));
    }

    // --- getItemsByReceipt ---

    @Test
    @DisplayName("getItemsByReceipt - Succes: Mapare corectă la DTO")
    void getItemsByReceipt_Success() {
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

        var result = receiptItemService.getItemsByReceipt(100);

        assertEquals(1, result.size());
        assertEquals("Test Product", result.get(0).productName());
        assertTrue(new BigDecimal("100.00").compareTo(result.get(0).lineTotal()) == 0);
    }

    @Test
    @DisplayName("getItemsByReceipt - Succes: Listă goală")
    void getItemsByReceipt_Empty() {
        when(itemRepository.findByReceiptId(100)).thenReturn(new ArrayList<>());
        var result = receiptItemService.getItemsByReceipt(100);
        assertTrue(result.isEmpty());
    }
}
package com.sellbit.domain.sales.fiscal;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatusRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceiptFiscalServiceTest {

    @Mock private ReceiptRepository receiptRepository;
    @Mock private ReceiptStatusRepository statusRepository;
    @Mock private ReceiptItemRepository itemRepository;
    @Mock private FiscalAgentService fiscalAgentService;
    @Mock private PurchaseService purchaseService;
    @Mock private ProductService productService;
    @Mock private ReceiptService receiptService;

    @InjectMocks
    private ReceiptFiscalService receiptFiscalService;

    private ReceiptStatus openStatus;
    private ReceiptStatus fiscalPendingStatus;
    private ReceiptStatus fiscalFailedStatus;
    private ReceiptStatus closedStatus;
    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        openStatus = new ReceiptStatus();
        openStatus.setCode("OPEN");

        fiscalPendingStatus = new ReceiptStatus();
        fiscalPendingStatus.setCode("FISCAL_PENDING");

        fiscalFailedStatus = new ReceiptStatus();
        fiscalFailedStatus.setCode("FISCAL_FAILED");

        closedStatus = new ReceiptStatus();
        closedStatus.setCode("CLOSED");

        warehouse = new Warehouse();
        warehouse.setId(1);
        warehouse.setName("Central");

        // În producție self e proxy-ul Spring (injectat @Lazy); în unit test e instanța directă
        receiptFiscalService.setSelf(receiptFiscalService);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // markFiscalPending
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("markFiscalPending - Eroare: Bon deja în FISCAL_PENDING")
    void markFiscalPending_Fail_AlreadyFiscalPending() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.ZERO, List.of(), List.of());
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.markFiscalPending(1));
        assertEquals("ERROR.RECEIPT.ALREADY_FISCAL_PENDING", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("markFiscalPending - Eroare: Status invalid (CLOSED)")
    void markFiscalPending_Fail_InvalidStatus() {
        Receipt receipt = buildReceipt(closedStatus, BigDecimal.ZERO, List.of(), List.of());
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.markFiscalPending(1));
        assertEquals("ERROR.RECEIPT.NOT_OPEN", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("markFiscalPending - Eroare: Plată incompletă")
    void markFiscalPending_Fail_IncompletePayment() {
        ReceiptPayment payment = ReceiptPayment.builder()
                .amount(new BigDecimal("99.00"))
                .build();
        Receipt receipt = buildReceipt(openStatus, new BigDecimal("100.00"), List.of(), List.of(payment));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.markFiscalPending(1));
        assertEquals("ERROR.RECEIPT.INCOMPLETE_PAYMENT", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("markFiscalPending - Eroare: Catering fără preț de achiziție")
    void markFiscalPending_Fail_CateringPriceNull() {
        ProductType cateringType = new ProductType();
        cateringType.setCode("CATERING");

        Product product = new Product();
        product.setProductType(cateringType);
        product.setPurchasePrice(null);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(BigDecimal.ONE)
                .warehouse(warehouse)
                .build();

        // Plata fără warehouse → sare validarea per-gestiune; suma = total
        ReceiptPayment payment = ReceiptPayment.builder()
                .amount(new BigDecimal("100.00"))
                .build();

        Receipt receipt = buildReceipt(openStatus, new BigDecimal("100.00"), List.of(item), List.of(payment));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.markFiscalPending(1));
        assertEquals("ERROR.CATERING.PURCHASE_PRICE_NULL", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("markFiscalPending - Succes: Setează FISCAL_PENDING și validează stocul")
    void markFiscalPending_Success() {
        Product product = new Product();
        product.setId(10);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(new BigDecimal("2.00"))
                .warehouse(warehouse)
                .build();

        // Plata fără warehouse → sare validarea per-gestiune; suma = total
        ReceiptPayment payment = ReceiptPayment.builder()
                .amount(new BigDecimal("100.00"))
                .build();

        Receipt receipt = buildReceipt(openStatus, new BigDecimal("100.00"), List.of(item), List.of(payment));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("FISCAL_PENDING")).thenReturn(Optional.of(fiscalPendingStatus));
        when(productService.resolveWarehouse(product, warehouse)).thenReturn(warehouse);

        receiptFiscalService.markFiscalPending(1);

        assertEquals("FISCAL_PENDING", receipt.getStatus().getCode());
        verify(purchaseService).validateStockAvailability(eq(1), eq(product), eq(new BigDecimal("2.00")));
        verify(receiptRepository).save(receipt);
    }

    @Test
    @DisplayName("markFiscalPending - Succes: Retry din FISCAL_FAILED")
    void markFiscalPending_Success_FromFiscalFailed() {
        Product product = new Product();
        product.setId(10);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(new BigDecimal("1.00"))
                .warehouse(warehouse)
                .build();

        ReceiptPayment payment = ReceiptPayment.builder()
                .amount(new BigDecimal("50.00"))
                .build();

        Receipt receipt = buildReceipt(fiscalFailedStatus, new BigDecimal("50.00"), List.of(item), List.of(payment));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("FISCAL_PENDING")).thenReturn(Optional.of(fiscalPendingStatus));
        when(productService.resolveWarehouse(product, warehouse)).thenReturn(warehouse);

        receiptFiscalService.markFiscalPending(1);

        assertEquals("FISCAL_PENDING", receipt.getStatus().getCode());
        verify(receiptRepository).save(receipt);
    }

    @Test
    @DisplayName("markFiscalPending - Eroare: Stoc insuficient")
    void markFiscalPending_Fail_StockUnavailable() {
        Product product = new Product();
        product.setId(10);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(new BigDecimal("5.00"))
                .warehouse(warehouse)
                .build();

        ReceiptPayment payment = ReceiptPayment.builder()
                .amount(new BigDecimal("100.00"))
                .build();

        Receipt receipt = buildReceipt(openStatus, new BigDecimal("100.00"), List.of(item), List.of(payment));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(productService.resolveWarehouse(product, warehouse)).thenReturn(warehouse);
        doThrow(new RuntimeException("ERROR.STOCK.INSUFFICIENT"))
                .when(purchaseService).validateStockAvailability(1, product, new BigDecimal("5.00"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.markFiscalPending(1));
        assertEquals("ERROR.STOCK.INSUFFICIENT", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("markFiscalPending - Eroare: Plăți per gestiune nu acoperă itemele gestiunii")
    void markFiscalPending_Fail_WarehousePaymentMismatch() {
        Warehouse warehouse2 = new Warehouse();
        warehouse2.setId(2);

        ReceiptItem item = ReceiptItem.builder()
                .product(new Product())
                .quantity(new BigDecimal("1.00"))
                .warehouse(warehouse2)
                .lineTotal(new BigDecimal("100.00"))
                .build();

        // Plata e pe gestiunea 2 dar acoperă doar 90 din 100
        ReceiptPayment payment = ReceiptPayment.builder()
                .amount(new BigDecimal("90.00"))
                .warehouse(warehouse2)
                .build();

        Receipt receipt = buildReceipt(openStatus, new BigDecimal("90.00"), List.of(item), List.of(payment));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.markFiscalPending(1));
        assertEquals("ERROR.RECEIPT.WAREHOUSE_PAYMENT_MISMATCH", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // rollbackToOpen
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("rollbackToOpen - Succes: Resetează statusul la OPEN")
    void rollbackToOpen_Success() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.ZERO, List.of(), List.of());
        when(receiptRepository.findById(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("OPEN")).thenReturn(Optional.of(openStatus));

        receiptFiscalService.rollbackToOpen(1);

        assertEquals("OPEN", receipt.getStatus().getCode());
        verify(receiptRepository).save(receipt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // completeFiscalClose
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("completeFiscalClose - Eroare: Bon nu este în FISCAL_PENDING")
    void completeFiscalClose_Fail_NotFiscalPending() {
        Receipt receipt = buildReceipt(openStatus, BigDecimal.ZERO, List.of(), List.of());
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.completeFiscalClose(1));
        assertEquals("ERROR.RECEIPT.NOT_FISCAL_PENDING", ex.getMessage());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("completeFiscalClose - Succes: Consumă FIFO, setează CLOSED, emite voucher")
    void completeFiscalClose_Success_FifoAndVoucher() {
        Product product = new Product();
        product.setId(10);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(new BigDecimal("3.00"))
                .warehouse(warehouse)
                .build();

        PaymentMethod cashMethod = new PaymentMethod();
        cashMethod.setCode("CASH");
        ReceiptPayment payment = ReceiptPayment.builder()
                .paymentMethod(cashMethod)
                .amount(new BigDecimal("150.00"))
                .build();

        Receipt receipt = buildReceipt(fiscalPendingStatus, new BigDecimal("150.00"),
                List.of(item), List.of(payment));

        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(productService.resolveWarehouse(product, warehouse)).thenReturn(warehouse);
        when(purchaseService.consumeForReceiptItemAndRecord(1, receipt, item))
                .thenReturn(new BigDecimal("40.00"));
        when(receiptService.finalizeClosedReceipt(receipt))
                .thenReturn(new CustomerVoucherDTOs.VoucherIssuanceResult(List.of(), null));

        var result = receiptFiscalService.completeFiscalClose(1);

        assertEquals("CLOSED", receipt.getStatus().getCode());
        assertNotNull(receipt.getClosedAt());
        assertEquals(new BigDecimal("40.00"), item.getPurchaseUnitPrice());
        verify(itemRepository).save(item);
        verify(receiptRepository).save(receipt);
        verify(receiptService).finalizeClosedReceipt(receipt);
        assertNotNull(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // registerAdvanceFiscal / registerGiftCardFiscal (bonuri directe)
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("registerAdvanceFiscal - Succes: creează FISCAL_PENDING, printează, închide")
    void registerAdvanceFiscal_Success() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.TEN, List.of(), List.of());
        when(receiptService.createDirectReceiptPending("ADVANCE", 1, BigDecimal.TEN, "CASH", 5, "nota"))
                .thenReturn(1);
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(fiscalAgentService.needsFiscalPrint(receipt)).thenReturn(true);
        when(fiscalAgentService.checkHealth()).thenReturn(true);
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(receiptService.finalizeClosedReceipt(receipt))
                .thenReturn(new CustomerVoucherDTOs.VoucherIssuanceResult(List.of(), null));

        receiptFiscalService.registerAdvanceFiscal(1, BigDecimal.TEN, "CASH", 5, "nota");

        assertEquals("CLOSED", receipt.getStatus().getCode());
        verify(fiscalAgentService).printGvBon(eq(receipt), any());
        verify(receiptService).finalizeClosedReceipt(receipt);
        verify(receiptRepository, never()).delete(any());
    }

    @Test
    @DisplayName("registerGiftCardFiscal - Succes: returnează voucherul emis la finalizare")
    void registerGiftCardFiscal_Success_ReturnsVoucher() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.TEN, List.of(), List.of());
        CustomerVoucherDTOs.IssuedVoucherInfo giftVoucher = new CustomerVoucherDTOs.IssuedVoucherInfo(
                7, "GIFT-ABC", "Card Cadou", "GIFT_CARD", "FIXED", BigDecimal.TEN,
                null, null, null, null, null);

        when(receiptService.createDirectReceiptPending("GIFT_CARD", 1, BigDecimal.TEN, "CARD", 5, null))
                .thenReturn(1);
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(receiptService.finalizeClosedReceipt(receipt))
                .thenReturn(new CustomerVoucherDTOs.VoucherIssuanceResult(List.of(giftVoucher), null));

        var issued = receiptFiscalService.registerGiftCardFiscal(1, BigDecimal.TEN, "CARD", 5, null);

        assertNotNull(issued);
        assertEquals("GIFT-ABC", issued.code());
    }

    @Test
    @DisplayName("registerAdvanceFiscal - Eroare sigură (CONNECT_FAILED): bonul se șterge")
    void registerAdvanceFiscal_ConnectFailed_DeletesReceipt() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.TEN, List.of(), List.of());
        when(receiptService.createDirectReceiptPending("ADVANCE", 1, BigDecimal.TEN, "CASH", 5, null))
                .thenReturn(1);
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findById(1)).thenReturn(Optional.of(receipt));
        when(fiscalAgentService.needsFiscalPrint(receipt)).thenReturn(true);
        when(fiscalAgentService.checkHealth()).thenReturn(true);
        when(fiscalAgentService.printGvBon(eq(receipt), any()))
                .thenThrow(new RuntimeException("ERROR.FISCAL.CONNECT_FAILED"));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> receiptFiscalService.registerAdvanceFiscal(1, BigDecimal.TEN, "CASH", 5, null));

        assertEquals("ERROR.FISCAL.CONNECT_FAILED", ex.getMessage());
        verify(receiptRepository).delete(receipt);
    }

    @Test
    @DisplayName("registerAdvanceFiscal - Incert (AGENT_UNREACHABLE, job există în Fisco): bonul rămâne pending")
    void registerAdvanceFiscal_Unreachable_JobExists_KeepsPending() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.TEN, List.of(), List.of());
        when(receiptService.createDirectReceiptPending("ADVANCE", 1, BigDecimal.TEN, "CASH", 5, null))
                .thenReturn(1);
        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(fiscalAgentService.needsFiscalPrint(receipt)).thenReturn(true);
        when(fiscalAgentService.checkHealth()).thenReturn(true);
        when(fiscalAgentService.printGvBon(eq(receipt), any()))
                .thenThrow(new RuntimeException("ERROR.FISCAL.AGENT_UNREACHABLE"));
        // primul apel (înainte de print) → "not_found" (nu blochează); al doilea (din catch,
        // după AGENT_UNREACHABLE) → "queued" (jobul există totuși la Fisco, rămâne pending)
        when(fiscalAgentService.findStatusByExternalId("sb-1")).thenReturn("not_found", "queued");

        assertThrows(RuntimeException.class,
                () -> receiptFiscalService.registerAdvanceFiscal(1, BigDecimal.TEN, "CASH", 5, null));

        verify(receiptRepository, never()).delete(any());
        assertEquals("FISCAL_PENDING", receipt.getStatus().getCode());
    }

    @Test
    @DisplayName("deletePendingReceipt - No-op: bonul nu mai este FISCAL_PENDING")
    void deletePendingReceipt_NoOp_WhenNotPending() {
        Receipt receipt = buildReceipt(closedStatus, BigDecimal.TEN, List.of(), List.of());
        when(receiptRepository.findById(1)).thenReturn(Optional.of(receipt));

        receiptFiscalService.deletePendingReceipt(1);

        verify(receiptRepository, never()).delete(any());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // markFiscalFailed
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("markFiscalFailed - No-op: Statusul nu este FISCAL_PENDING")
    void markFiscalFailed_NoOp_WhenNotFiscalPending() {
        Receipt receipt = buildReceipt(openStatus, BigDecimal.ZERO, List.of(), List.of());
        when(receiptRepository.findById(1)).thenReturn(Optional.of(receipt));

        receiptFiscalService.markFiscalFailed(1);

        assertEquals("OPEN", receipt.getStatus().getCode());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("markFiscalFailed - Succes: Setează FISCAL_FAILED")
    void markFiscalFailed_Success() {
        Receipt receipt = buildReceipt(fiscalPendingStatus, BigDecimal.ZERO, List.of(), List.of());
        when(receiptRepository.findById(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("FISCAL_FAILED")).thenReturn(Optional.of(fiscalFailedStatus));

        receiptFiscalService.markFiscalFailed(1);

        assertEquals("FISCAL_FAILED", receipt.getStatus().getCode());
        verify(receiptRepository).save(receipt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private Receipt buildReceipt(ReceiptStatus status, BigDecimal total,
                                  List<ReceiptItem> items, List<ReceiptPayment> payments) {
        return Receipt.builder()
                .id(1)
                .status(status)
                .totalAmount(total)
                .items(new ArrayList<>(items))
                .payments(new ArrayList<>(payments))
                .build();
    }
}

package com.sellbit.domain.sales.receipt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.cancelreason.CancelReason;
import com.sellbit.domain.lookup.cancelreason.CancelReasonRepository;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatusRepository;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.sales.receiptpayment.ReceiptPaymentRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import com.sellbit.domain.store.StoreRepository;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherRepository;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherService;

@ExtendWith(MockitoExtension.class)
class ReceiptServiceTest {

    @Mock private ReceiptRepository receiptRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private ReceiptStatusRepository statusRepository;
    @Mock private UserRepository userRepository;
    @Mock private CancelReasonRepository cancelReasonRepository;
    @Mock private StockCurrentService stockCurrentService;
    @Mock private CashMovementService cashMovementService;
    @Mock private ReceiptItemRepository itemRepository;
    @Mock private PurchaseService purchaseService;
    @Mock private CustomerVoucherService voucherService;
    @Mock private ReceiptPaymentRepository paymentRepository;
    @Mock private CustomerVoucherRepository customerVoucherRepository;
    @Mock private StoreRepository storeRepository;

    @InjectMocks
    private ReceiptService receiptService;

    private Receipt receipt;
    private ReceiptStatus openStatus;
    private ReceiptStatus closedStatus;
    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        warehouse = new Warehouse();
        warehouse.setId(1);
        warehouse.setName("Central");

        openStatus = new ReceiptStatus();
        openStatus.setCode("OPEN");
        openStatus.setLabel("Deschis");

        closedStatus = new ReceiptStatus();
        closedStatus.setCode("CLOSED");
        closedStatus.setLabel("Inchis");

        receipt = Receipt.builder()
                .id(100)
                .warehouse(warehouse)
                .status(openStatus)
                .tableName("Masa 10")
                .totalAmount(new BigDecimal("100.00"))
                .items(new ArrayList<>())
                .payments(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .build();
    }

    // --- 1. createReceipt ---
    @Test
    @DisplayName("createReceipt - Succes: Creare bon nou")
    void createReceipt_Success() {
        var req = new ReceiptDTOs.CreateRequest(1, "Masa 1", 1, "Note");
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(statusRepository.findByCode("OPEN")).thenReturn(Optional.of(openStatus));
        when(receiptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var res = receiptService.createReceipt(req);
        assertNotNull(res);
        assertEquals("Masa 1", res.tableName());
        verify(receiptRepository).save(any());
    }

    @Test
    @DisplayName("createReceipt - Eroare: Warehouse inexistent")
    void createReceipt_Fail_WarehouseNotFound() {
        var req = new ReceiptDTOs.CreateRequest(99, "Masa 1", 1, null);
        when(warehouseRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> receiptService.createReceipt(req));
    }

    // --- 2. getUnclosedAlerts ---
    @Test
    @DisplayName("getUnclosedAlerts - Succes: Returnează bonuri din zilele anterioare")
    void getUnclosedAlerts_Success() {
        receipt.setCreatedAt(LocalDateTime.now().minusDays(1));
        when(receiptRepository.findByStatus_Code("OPEN")).thenReturn(List.of(receipt));

        var alerts = receiptService.getUnclosedAlerts();
        assertFalse(alerts.isEmpty());
        assertEquals("Masa 10", alerts.get(0).tableName());
    }

    @Test
    @DisplayName("getUnclosedAlerts - Gol: Bonurile de azi nu sunt alerte")
    void getUnclosedAlerts_EmptyForToday() {
        receipt.setCreatedAt(LocalDateTime.now());
        when(receiptRepository.findByStatus_Code("OPEN")).thenReturn(List.of(receipt));

        var alerts = receiptService.getUnclosedAlerts();
        assertTrue(alerts.isEmpty());
    }

    // --- 3. cancelOpenReceipt ---
    @Test
    @DisplayName("cancelOpenReceipt - Succes: Returnează stocul și anulează")
    void cancelOpenReceipt_Success() {
        ReceiptItem item = ReceiptItem.builder().product(new com.sellbit.domain.catalog.product.Product()).quantity(new BigDecimal("5.00")).build();
        item.getProduct().setId(20);
        receipt.getItems().add(item);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(cancelReasonRepository.findById(1)).thenReturn(Optional.of(new CancelReason()));
        when(statusRepository.findByCode("CANCELLED")).thenReturn(Optional.of(new ReceiptStatus()));

        receiptService.cancelOpenReceipt(100, 1);

        verify(stockCurrentService).syncStockFromReceiptChange(eq(1), eq(20), eq(new BigDecimal("5.00")), eq(BigDecimal.ZERO));
        verify(receiptRepository).save(receipt);
    }

    // --- 4. closeReceipt ---
    @Test
    @DisplayName("closeReceipt - Succes: Închide bonul și procesează plățile")
    void closeReceipt_Success() {
        // 1. Setup Statuses folosind Builder
        ReceiptStatus openStatus = ReceiptStatus.builder()
                .code("OPEN")
                .label("Deschis")
                .build();
        
        ReceiptStatus closedStatus = ReceiptStatus.builder()
                .code("CLOSED")
                .label("Închis")
                .build();

        // 2. Setup Metoda de Plată
        com.sellbit.domain.lookup.paymentmethod.PaymentMethod cashMethod = new com.sellbit.domain.lookup.paymentmethod.PaymentMethod();
        cashMethod.setCode("CASH");

        // 3. Setup Plata
        ReceiptPayment payment = new ReceiptPayment();
        payment.setAmount(new BigDecimal("100.00"));
        payment.setPaymentMethod(cashMethod);

        // 4. Setup Warehouse și User
        Warehouse warehouse = new Warehouse();
        warehouse.setId(1);
        
        User user = new User();
        user.setId(1);

        // 5. Setup Bonul (Receipt)
        Receipt receipt = new Receipt();
        receipt.setId(100);
        receipt.setStatus(openStatus);
        receipt.setWarehouse(warehouse);
        receipt.setUser(user);
        receipt.setTotalAmount(new BigDecimal("100.00"));
        receipt.setPayments(new java.util.ArrayList<>(List.of(payment)));
        receipt.setItems(new java.util.ArrayList<>()); 

        // 6. Mockito Expectations
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));

        // 7. Execuție
        receiptService.closeReceipt(100);

        // 8. Verificări
        assertEquals("CLOSED", receipt.getStatus().getCode());
        verify(receiptRepository).save(receipt);
    }

    @Test
    @DisplayName("closeReceipt - Eroare: Plată incompletă")
    void closeReceipt_Fail_Payment() {
        receipt.getPayments().add(ReceiptPayment.builder().amount(new BigDecimal("99.99")).build());
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> receiptService.closeReceipt(100));
        assertEquals("ERROR.RECEIPT.INCOMPLETE_PAYMENT", ex.getMessage());
    }

    // --- 5. updateReceiptTotals ---
    @Test
    @DisplayName("updateReceiptTotals - Succes: Recalculează corect")
    void updateReceiptTotals_Success() {
        ReceiptItem item = ReceiptItem.builder()
                .lineTotal(new BigDecimal("10.00")).netTotal(new BigDecimal("8.00")).vatTotal(new BigDecimal("2.00"))
                .build();
        receipt.getItems().add(item);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        
        receiptService.updateReceiptTotals(100);

        assertEquals(0, new BigDecimal("10.00").compareTo(receipt.getTotalAmount()));
        verify(receiptRepository).save(receipt);
    }

    // --- 6. createPartialRefund ---
    @Test
    @DisplayName("createPartialRefund - Succes: Verifică mișcare CASH și sync stoc")
    void createPartialRefund_Success() {
        receipt.setStatus(closedStatus);
        
        ReceiptItem originalItem = ReceiptItem.builder()
                .id(1)
                .quantity(new BigDecimal("2.00"))
                .unitPrice(new BigDecimal("50.00"))
                .vatRate(new BigDecimal("25.00")) 
                .lineTotal(new BigDecimal("100.00"))
                .netTotal(new BigDecimal("80.00"))
                .vatTotal(new BigDecimal("20.00"))
                .product(new com.sellbit.domain.catalog.product.Product())
                .build();
                
        originalItem.getProduct().setId(10);
        receipt.getItems().add(originalItem);

        PaymentMethod cash = PaymentMethod.builder().code("CASH").build();
        receipt.getPayments().add(ReceiptPayment.builder().paymentMethod(cash).amount(new BigDecimal("100.00")).build());

        var req = new ReceiptDTOs.RefundRequest(1, List.of(new ReceiptDTOs.RefundItemRequest(1, BigDecimal.ONE)));

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(userRepository.getReferenceById(1)).thenReturn(new User());
        when(receiptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var res = receiptService.createPartialRefund(100, req);

        verify(stockCurrentService).syncStockFromReceiptChange(
                eq(1), eq(10), 
                argThat(val -> val.compareTo(BigDecimal.ZERO) == 0), 
                argThat(val -> val.compareTo(new BigDecimal("-1")) == 0)
        );

        verify(cashMovementService).createMovement(
                eq(1), eq("REFUND"), 
                argThat(val -> val.compareTo(new BigDecimal("50")) == 0), 
                eq(1), anyString()
        );

        assertTrue(new BigDecimal("-50.00").compareTo(res.totalAmount()) == 0);
    }

    // --- 7. getGrossProfitReport ---
    @Test
    @DisplayName("getGrossProfitReport - Succes")
    void getGrossProfitReport_Success() {
        when(itemRepository.calculateTotalProfit(any(), any())).thenReturn(new BigDecimal("150.00"));
        when(paymentRepository.getTotalVoucherDiscounts(any(), any())).thenReturn(BigDecimal.ZERO);
        
        var res = receiptService.getGrossProfitReport(LocalDateTime.now(), LocalDateTime.now());
        
        assertEquals(0, new BigDecimal("150.00").compareTo(res));
    }
    
    // --- 8. getActiveReceipts ---
    @Test
    @DisplayName("getActiveReceipts - Succes: Returnează bonurile deschise pentru gestiunea corectă")
    void getActiveReceipts_Success() {
        Integer warehouseId = 1;
        when(receiptRepository.findByWarehouseIdAndStatus_Code(warehouseId, "OPEN"))
                .thenReturn(List.of(receipt));

        List<ReceiptDTOs.Response> result = receiptService.getActiveReceipts(warehouseId);

        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
        assertEquals("Masa 10", result.get(0).tableName());
        verify(receiptRepository).findByWarehouseIdAndStatus_Code(warehouseId, "OPEN");
    }

    @Test
    @DisplayName("getActiveReceipts - Valid: Returnează listă goală dacă nu sunt bonuri deschise")
    void getActiveReceipts_Empty() {
        Integer warehouseId = 99;
        when(receiptRepository.findByWarehouseIdAndStatus_Code(warehouseId, "OPEN"))
                .thenReturn(List.of());

        List<ReceiptDTOs.Response> result = receiptService.getActiveReceipts(warehouseId);

        assertTrue(result.isEmpty());
        verify(receiptRepository).findByWarehouseIdAndStatus_Code(warehouseId, "OPEN");
    }

    // --- 9. getReceiptsReport ---
    @Test
    @DisplayName("getReceiptsReport - Succes: Filtrează corect după status și perioadă")
    void getReceiptsReport_Success() {
        Integer warehouseId = 1;
        String status = "CLOSED";
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        
        receipt.setStatus(closedStatus);
        when(receiptRepository.findByWarehouseIdAndStatus_CodeAndClosedAtBetween(warehouseId, status, start, end))
                .thenReturn(List.of(receipt));

        List<ReceiptDTOs.Response> result = receiptService.getReceiptsReport(warehouseId, status, start, end);

        assertFalse(result.isEmpty());
        assertEquals(1, result.size());
        verify(receiptRepository).findByWarehouseIdAndStatus_CodeAndClosedAtBetween(warehouseId, status, start, end);
    }

    @Test
    @DisplayName("getReceiptsReport - Valid: Returnează listă goală când nu există date în intervalul ales")
    void getReceiptsReport_NoData() {
        Integer warehouseId = 1;
        String status = "CLOSED";
        LocalDateTime start = LocalDateTime.now().plusYears(1); 
        LocalDateTime end = LocalDateTime.now().plusYears(2);
        
        when(receiptRepository.findByWarehouseIdAndStatus_CodeAndClosedAtBetween(eq(warehouseId), eq(status), any(), any()))
                .thenReturn(List.of());

        List<ReceiptDTOs.Response> result = receiptService.getReceiptsReport(warehouseId, status, start, end);

        assertTrue(result.isEmpty());
        verify(receiptRepository).findByWarehouseIdAndStatus_CodeAndClosedAtBetween(eq(warehouseId), eq(status), any(), any());
    }
    
 // --- 10. closeReceipt - Scenarii FIFO ---
    @Test
    @DisplayName("closeReceipt - Succes: Verifică salvarea prețului de achiziție FIFO")
    void closeReceipt_Success_FIFO() {
        ReceiptItem item = ReceiptItem.builder()
                .product(new com.sellbit.domain.catalog.product.Product())
                .quantity(new BigDecimal("2.00"))
                .build();
        item.getProduct().setId(5);
        receipt.setItems(new ArrayList<>(List.of(item)));
        receipt.setPayments(List.of(ReceiptPayment.builder().amount(new BigDecimal("100.00")).build()));

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(purchaseService.getCurrentFIFOPurchasePrice(1, 5)).thenReturn(new BigDecimal("40.00"));

        receiptService.closeReceipt(100);

        assertEquals(new BigDecimal("40.00"), item.getPurchaseUnitPrice());
        verify(purchaseService).deductFromBatchesFIFO(1, 5, new BigDecimal("2.00"));
        verify(itemRepository).save(item);
    }

    // --- 11. createPartialRefund - Scenarii Card și Validări ---
    @Test
    @DisplayName("createPartialRefund - Succes: Verifică mișcare CARD")
    void createPartialRefund_Success_Card() {
        receipt.setStatus(closedStatus);
        ReceiptItem item = ReceiptItem.builder().id(1).quantity(BigDecimal.ONE).unitPrice(BigDecimal.TEN).vatRate(BigDecimal.ZERO)
                .product(new com.sellbit.domain.catalog.product.Product()).build();
        item.getProduct().setId(1);
        receipt.setItems(List.of(item));

        PaymentMethod card = PaymentMethod.builder().code("CARD").build();
        receipt.getPayments().add(ReceiptPayment.builder().paymentMethod(card).amount(BigDecimal.TEN).build());

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(userRepository.getReferenceById(1)).thenReturn(new User());
        when(receiptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        receiptService.createPartialRefund(100, new ReceiptDTOs.RefundRequest(1, List.of(new ReceiptDTOs.RefundItemRequest(1, BigDecimal.ONE))));

        // Am înlocuit anyInt() cu eq(1) (userId din request)
        verify(cashMovementService).createMovement(eq(1), eq("REFUND_CARD"), any(BigDecimal.class), eq(1), anyString());
    }

    @Test
    @DisplayName("createPartialRefund - Eroare: Cantitate returnată prea mare")
    void createPartialRefund_Fail_QtyExceeded() {
        receipt.setStatus(closedStatus);
        receipt.setItems(List.of(ReceiptItem.builder().id(1).quantity(BigDecimal.ONE).build()));
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        
        var req = new ReceiptDTOs.RefundRequest(1, List.of(new ReceiptDTOs.RefundItemRequest(1, new BigDecimal("2.00"))));
        assertThrows(RuntimeException.class, () -> receiptService.createPartialRefund(100, req));
    }

    // --- 12. removeVoucherPayment (Metodă Nouă) ---
    @Test
    @DisplayName("removeVoucherPayment - Succes")
    void removeVoucherPayment_Success() {
        ReceiptPayment payment = ReceiptPayment.builder().id(1).receipt(receipt).build();
        when(paymentRepository.findById(1)).thenReturn(Optional.of(payment));

        receiptService.removeVoucherPayment(100, 1);

        verify(paymentRepository).delete(payment);
        verify(voucherService).cancelVoucherUsage(100);
    }

    @Test
    @DisplayName("removeVoucherPayment - Eroare: Plata aparține altui bon")
    void removeVoucherPayment_Fail_Mismatch() {
        Receipt other = Receipt.builder().id(999).build();
        ReceiptPayment payment = ReceiptPayment.builder().id(1).receipt(other).build();
        when(paymentRepository.findById(1)).thenReturn(Optional.of(payment));

        assertThrows(RuntimeException.class, () -> receiptService.removeVoucherPayment(100, 1));
    }

    // --- 13. getBillNoteData (Metodă Nouă - Print) ---
    @Test
    @DisplayName("getBillNoteData - Succes: Calculează restul de plată")
    void getBillNoteData_Success_Open() {
        com.sellbit.domain.store.Store store = new com.sellbit.domain.store.Store();
        store.setName("Test Store");
        when(storeRepository.getSettings()).thenReturn(Optional.of(store));
        
        receipt.setTotalAmount(new BigDecimal("100.00"));
        receipt.getPayments().add(ReceiptPayment.builder()
                .amount(new BigDecimal("20.00"))
                .paymentMethod(PaymentMethod.builder().code("VOUCHER").build())
                .build());

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(customerVoucherRepository.findByUsedReceiptId(100)).thenReturn(Optional.empty());

        var res = receiptService.getBillNoteData(100);

        assertEquals(new BigDecimal("20.00"), res.voucherValue());
        assertEquals(new BigDecimal("80.00"), res.totalToPay()); 
    }

    @Test
    @DisplayName("getBillNoteData - Eroare: Store lipsă")
    void getBillNoteData_Fail_Store() {
        when(storeRepository.getSettings()).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> receiptService.getBillNoteData(100));
    }
}
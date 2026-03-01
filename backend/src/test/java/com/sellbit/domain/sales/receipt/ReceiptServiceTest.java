package com.sellbit.domain.sales.receipt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.productcomposite.ProductComponent;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.config.InsufficientStockException;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.cancelreason.CancelReason;
import com.sellbit.domain.lookup.cancelreason.CancelReasonRepository;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethodRepository;
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
    @Mock private PaymentMethodRepository paymentMethodRepository;
    @Mock private ProductRepository productRepository; 
    @Mock private ProductComponentRepository productComponentRepository;

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
        
        // --- FIX AICI: Verificăm string-ul procesat de mapToResponse ("Masa: ...") ---
        assertEquals("Masa: Masa 1", res.tableName());
        
        verify(receiptRepository).save(any());
    }

    @Test
    @DisplayName("createReceipt - Eroare: Warehouse inexistent")
    void createReceipt_Fail_WarehouseNotFound() {
        var req = new ReceiptDTOs.CreateRequest(99, "Masa 1", 1, null);
        when(warehouseRepository.findById(99)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> receiptService.createReceipt(req));
    }

    @Test
    @DisplayName("getReceiptById - Succes: Returnează Receipt complet")
    void getReceiptById_Success() {
        receipt.setPayments(new ArrayList<>());
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));

        var res = receiptService.getReceiptById(100);

        assertNotNull(res);
        assertEquals(100, res.id());
        assertEquals("Masa: Masa 10", res.tableName());
        assertEquals(warehouse.getId(), res.warehouseId());
        verify(receiptRepository).findById(100);
    }

    @Test
    @DisplayName("getReceiptById - Eroare: Receipt inexistent")
    void getReceiptById_Fail_NotFound() {
        when(receiptRepository.findById(999)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> receiptService.getReceiptById(999));
        assertEquals("ERROR.RECEIPT.NOT_FOUND", ex.getMessage());
    }

    // --- 2. getUnclosedAlerts ---
    @Test
    @DisplayName("getUnclosedAlerts - Succes: Returnează bonuri din zilele anterioare")
    void getUnclosedAlerts_Success() {
        receipt.setCreatedAt(LocalDateTime.now().minusDays(1));
        when(receiptRepository.findByStatus_Code("OPEN")).thenReturn(List.of(receipt));

        var alerts = receiptService.getUnclosedAlerts();
        assertFalse(alerts.isEmpty());
        // Aici rămâne "Masa 10" curat, pentru că metoda nu trece prin mapToResponse
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
        ReceiptItem item = ReceiptItem.builder().product(new Product()).quantity(new BigDecimal("5.00")).build();
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
        // 1. Setup Statuses
        ReceiptStatus openStatus = ReceiptStatus.builder().code("OPEN").label("Deschis").build();
        ReceiptStatus closedStatus = ReceiptStatus.builder().code("CLOSED").label("Închis").build();

        // 2. Setup Metoda de Plată
        PaymentMethod cashMethod = new PaymentMethod();
        cashMethod.setCode("CASH");
        cashMethod.setLabel("Numerar");

        // 3. Setup Plata
        ReceiptPayment payment = new ReceiptPayment();
        payment.setAmount(new BigDecimal("100.00"));
        payment.setPaymentMethod(cashMethod);

        // 4. Setup Bonul
        Receipt receipt = new Receipt();
        receipt.setId(100);
        receipt.setStatus(openStatus);
        receipt.setWarehouse(warehouse);
        receipt.setUser(new User());
        receipt.setTotalAmount(new BigDecimal("100.00"));
        receipt.setPayments(new ArrayList<>(List.of(payment)));
        receipt.setItems(new ArrayList<>()); 

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));

        receiptService.closeReceipt(100);

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

    @Test
    @DisplayName("closeReceipt - Eroare: Catering fără preț achiziție")
    void closeReceipt_Fail_CateringPrice() {
        receipt.setStatus(openStatus);
        
        Product cateringProduct = new Product();
        ProductType type = new ProductType();
        type.setCode("CATERING");
        cateringProduct.setProductType(type);
        cateringProduct.setPurchasePrice(null); 

        ReceiptPayment payment = ReceiptPayment.builder().amount(new BigDecimal("100.00")).build();
        receipt.setPayments(List.of(payment));
        receipt.setTotalAmount(new BigDecimal("100.00"));

        ReceiptItem item = ReceiptItem.builder().product(cateringProduct).quantity(BigDecimal.ONE).build();
        receipt.setItems(List.of(item));

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> receiptService.closeReceipt(100));
        assertEquals("ERROR.CATERING.PURCHASE_PRICE_NULL", ex.getMessage());
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
                .product(new Product())
                .build();
                
        originalItem.getProduct().setId(10);
        receipt.getItems().add(originalItem);
        
        PaymentMethod cash = PaymentMethod.builder().id(1).code("CASH").label("Numerar").build();
        when(paymentMethodRepository.findById(1)).thenReturn(Optional.of(cash));
        receipt.getPayments().add(ReceiptPayment.builder().paymentMethod(cash).amount(new BigDecimal("100.00")).build());

        var req = new ReceiptDTOs.RefundRequest(1, List.of(new ReceiptDTOs.RefundItemRequest(1, BigDecimal.ONE)),1);

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
        // mapToResponse uses originalReceipt to format tableName as "Stornare la Bon #<originalId>"
        assertTrue(res.tableName().contains("Stornare la Bon #"));
    }

    // --- 7. getGrossProfitReport - Calcul DETALIAT PROFIT ---
    @Test
    @DisplayName("getGrossProfitReport - Succes: Net 200 - Purchase 80 = Profit 120 (fara voucher)")
    void getGrossProfitReport_Success_NoVoucher() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        Integer warehouseId = 1;
        
        // Scenario: Net=200, Purchase=80, Voucher=0 => Profit=120
        when(itemRepository.calculateTotalProfit(start, end, warehouseId)).thenReturn(new BigDecimal("120.00"));
        when(paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId)).thenReturn(BigDecimal.ZERO);
        
        BigDecimal profit = receiptService.getGrossProfitReport(start, end, warehouseId);
        
        assertEquals(0, new BigDecimal("120.00").compareTo(profit));
    }

    @Test
    @DisplayName("getGrossProfitReport - Succes: Net 200 - Purchase 80 - Voucher 20 (16.53 NET) = Profit 103.47")
    void getGrossProfitReport_Success_WithVoucher() {
        LocalDateTime start = LocalDateTime.now().minusDays(7);
        LocalDateTime end = LocalDateTime.now();
        Integer warehouseId = 2;
        
        // Scenario: Net=200, Purchase=80, Voucher=20 brut (16.53 net cu TVA 21%) => Profit=103.47
        // itemRepository.calculateTotalProfit = 200 - 80 = 120
        // paymentRepository.getTotalVoucherDiscounts = 16.53 (voucher cu proportie NET aplicata)
        // Result = 120 - 16.53 = 103.47
        when(itemRepository.calculateTotalProfit(start, end, warehouseId)).thenReturn(new BigDecimal("120.00"));
        when(paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId)).thenReturn(new BigDecimal("16.53"));
        
        BigDecimal profit = receiptService.getGrossProfitReport(start, end, warehouseId);
        
        assertEquals(0, new BigDecimal("103.47").compareTo(profit));
    }

    @Test
    @DisplayName("getGrossProfitReport - Succes: Zero Profit")
    void getGrossProfitReport_Success_ZeroProfit() {
        LocalDateTime start = LocalDateTime.now().minusMonths(1);
        LocalDateTime end = LocalDateTime.now();
        Integer warehouseId = 1;
        
        // Scenario: Net=100, Purchase=100 => Profit=0
        when(itemRepository.calculateTotalProfit(start, end, warehouseId)).thenReturn(BigDecimal.ZERO);
        when(paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId)).thenReturn(BigDecimal.ZERO);
        
        BigDecimal profit = receiptService.getGrossProfitReport(start, end, warehouseId);
        
        assertEquals(0, BigDecimal.ZERO.compareTo(profit));
    }

    @Test
    @DisplayName("getGrossProfitReport - Succes: Negative Profit (loss)")
    void getGrossProfitReport_Success_NegativeProfit() {
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        Integer warehouseId = 1;
        
        // Scenario: Net=50, Purchase=100 = -50 (pierdere)
        // itemRepository.calculateTotalProfit = 50 - 100 = -50
        when(itemRepository.calculateTotalProfit(start, end, warehouseId)).thenReturn(new BigDecimal("-50.00"));
        when(paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId)).thenReturn(BigDecimal.ZERO);
        
        BigDecimal profit = receiptService.getGrossProfitReport(start, end, warehouseId);
        
        assertEquals(0, new BigDecimal("-50.00").compareTo(profit));
    }

    @Test
    @DisplayName("getGrossProfitReport - Succes: Multiple Vouchers (cumulative discount)")
    void getGrossProfitReport_Success_MultipleVouchers() {
        LocalDateTime start = LocalDateTime.now().minusDays(30);
        LocalDateTime end = LocalDateTime.now();
        Integer warehouseId = 3;
        
        // Scenario: Net=500, Purchase=200, Vouchers=50+30=80 brut (66.12 net cu TVA 21%) => Profit=233.88
        // itemRepository.calculateTotalProfit = 500 - 200 = 300
        // paymentRepository.getTotalVoucherDiscounts = 66.12 (suma voucher-elor cu proportie NET aplicata)
        // Result = 300 - 66.12 = 233.88
        when(itemRepository.calculateTotalProfit(start, end, warehouseId)).thenReturn(new BigDecimal("300.00"));
        when(paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId)).thenReturn(new BigDecimal("66.12"));
        
        BigDecimal profit = receiptService.getGrossProfitReport(start, end, warehouseId);
        
        assertEquals(0, new BigDecimal("233.88").compareTo(profit));
    }

    @Test
    @DisplayName("getGrossProfitReport - Succes: High Volume (Net 5000 - Purchase 2000 - Voucher 500 brut = Profit 2586.78)")
    void getGrossProfitReport_Success_HighVolume() {
        LocalDateTime start = LocalDateTime.now().minusDays(365);
        LocalDateTime end = LocalDateTime.now();
        Integer warehouseId = 1;
        
        // Scenario realista: Vanzari 5000, Achizitii 2000, Vouchere 500 brut (413.22 net cu TVA 21%) => Profit 2586.78
        when(itemRepository.calculateTotalProfit(start, end, warehouseId)).thenReturn(new BigDecimal("3000.00"));
        when(paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId)).thenReturn(new BigDecimal("413.22"));
        
        BigDecimal profit = receiptService.getGrossProfitReport(start, end, warehouseId);
        
        assertEquals(0, new BigDecimal("2586.78").compareTo(profit));
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
        
        // --- FIX AICI: Numele este "Masa: Masa 10" din cauza mapToResponse ---
        assertEquals("Masa: Masa 10", result.get(0).tableName());
        
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
                .product(new Product())
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
                .product(new Product()).build();
        item.getProduct().setId(1);
        receipt.setItems(List.of(item));

        PaymentMethod card = PaymentMethod.builder().code("CARD").label("Card").build();
        when(paymentMethodRepository.findById(1)).thenReturn(Optional.of(card));
        receipt.getPayments().add(ReceiptPayment.builder().paymentMethod(card).amount(BigDecimal.TEN).build());

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(userRepository.getReferenceById(1)).thenReturn(new User());
        when(receiptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        receiptService.createPartialRefund(100, new ReceiptDTOs.RefundRequest(1, List.of(new ReceiptDTOs.RefundItemRequest(1, BigDecimal.ONE)),1));

        verify(cashMovementService).createMovement(eq(1), eq("REFUND_CARD"), any(BigDecimal.class), eq(1), anyString());
    }

    @Test
    @DisplayName("createPartialRefund - Eroare: Cantitate returnată prea mare")
    void createPartialRefund_Fail_QtyExceeded() {
        receipt.setStatus(closedStatus);
        receipt.setItems(List.of(ReceiptItem.builder().id(1).quantity(BigDecimal.ONE).build()));
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        
        var req = new ReceiptDTOs.RefundRequest(1, List.of(new ReceiptDTOs.RefundItemRequest(1, new BigDecimal("2.00"))),1);
        assertThrows(RuntimeException.class, () -> receiptService.createPartialRefund(100, req));
    }

    // --- 13. getBillNoteData (Metodă Nouă - Print) ---
    @Test
    @DisplayName("getBillNoteData - Succes: Calculeaza restul cu voucher")
    void getBillNoteData_Success_WithVoucher() {
        com.sellbit.domain.store.Store store = new com.sellbit.domain.store.Store();
        store.setName("Test Store");
        store.setAddress("Test Address");
        store.setPhone("0123456789");
        when(storeRepository.getSettings()).thenReturn(Optional.of(store));
        
        receipt.setStatus(closedStatus);
        receipt.setTotalAmount(new BigDecimal("100.00"));
        receipt.getPayments().add(ReceiptPayment.builder()
                .amount(new BigDecimal("20.00"))
                .paymentMethod(PaymentMethod.builder().code("VOUCHER").build())
                .build());
        receipt.getPayments().add(ReceiptPayment.builder()
                .amount(new BigDecimal("80.00"))
                .paymentMethod(PaymentMethod.builder().code("CASH").build())
                .build());

        ReceiptItem item = ReceiptItem.builder()
                .product(new Product())
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("100.00"))
                .build();
        item.getProduct().setName("Test Product");
        receipt.setItems(List.of(item));

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(customerVoucherRepository.findByUsedReceiptId(100)).thenReturn(Optional.empty());

        var res = receiptService.getBillNoteData(100);

        assertEquals("Test Store", res.storeName());
        assertEquals("Test Address", res.storeAddress());
        assertEquals("0123456789", res.storePhone());
        assertEquals(new BigDecimal("20.00"), res.voucherValue());
        assertEquals(new BigDecimal("80.00"), res.totalToPay());
        assertEquals(new BigDecimal("100.00"), res.subtotal());
        assertFalse(res.items().isEmpty());
        assertEquals(1, res.items().size());
    }

    @Test
    @DisplayName("getBillNoteData - Succes: Receipt OPEN fara plati")
    void getBillNoteData_Success_Open() {
        com.sellbit.domain.store.Store store = new com.sellbit.domain.store.Store();
        store.setName("Test Store");
        store.setAddress("Strada Test");
        store.setPhone("0987654321");
        when(storeRepository.getSettings()).thenReturn(Optional.of(store));
        
        receipt.setStatus(openStatus);
        receipt.setTotalAmount(new BigDecimal("150.00"));
        receipt.setPayments(new ArrayList<>());

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(customerVoucherRepository.findByUsedReceiptId(100)).thenReturn(Optional.empty());

        var res = receiptService.getBillNoteData(100);

        assertEquals("Test Store", res.storeName());
        assertEquals(new BigDecimal("150.00"), res.totalToPay());
        assertNull(res.voucherValue());
    }

    @Test
    @DisplayName("getBillNoteData - Eroare: Store lipsa")
    void getBillNoteData_Fail_Store() {
        when(storeRepository.getSettings()).thenReturn(Optional.empty());
        assertThrows(RuntimeException.class, () -> receiptService.getBillNoteData(100));
    }

    // NOU: Teste Avans (lipseau din clasa veche)
    @Test
    @DisplayName("registerAdvancePayment - Succes: Flux complet cu TVA 19%")
    void registerAdvancePayment_Success() {
        Integer warehouseId = 1;
        BigDecimal amount = new BigDecimal("119.00");
        String pmCode = "CASH";
        Integer userId = 5;

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        User user = new User();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        
        Product advanceProd = new Product();
        VatRate vat = new VatRate();
        vat.setRate(new BigDecimal("19.00"));
        advanceProd.setVatRate(vat);
        
        when(productRepository.findByProductTypeCode("ADVANCE")).thenReturn(List.of(advanceProd));
        
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        PaymentMethod pm = new PaymentMethod();
        pm.setCode("CASH");
        when(paymentMethodRepository.findByCode(pmCode)).thenReturn(Optional.of(pm));

        when(receiptRepository.save(any(Receipt.class))).thenAnswer(i -> {
            Receipt r = i.getArgument(0);
            r.setId(777);
            return r;
        });

        receiptService.registerAdvancePayment(warehouseId, amount, pmCode, userId, "Test note");

        verify(receiptRepository).save(argThat(r -> 
            r.getStatus().getCode().equals("CLOSED") &&
            r.getTotalAmount().compareTo(amount) == 0 &&
            r.getTotalNet().compareTo(new BigDecimal("100.00")) == 0 &&
            "Avans Petrecere".equals(r.getTableName())
        ));

        verify(itemRepository).save(argThat(item -> 
            item.getQuantity().compareTo(BigDecimal.ONE) == 0 &&
            item.getUnitPrice().compareTo(amount) == 0 &&
            !item.isServiceTime() &&
            item.getServiceEndAt() == null
        ));
        verify(paymentRepository).save(any(ReceiptPayment.class));
        verify(cashMovementService).createMovement(eq(warehouseId), eq("SALE"), eq(amount), eq(userId), anyString());
    }

    @Test
    @DisplayName("registerAdvancePayment - Succes: Calcul TVA diferit (0%)")
    void registerAdvancePayment_Success_NoVat() {
        Integer warehouseId = 1;
        BigDecimal amount = new BigDecimal("100.00");
        String pmCode = "CASH";
        Integer userId = 5;

        when(warehouseRepository.findById(warehouseId)).thenReturn(Optional.of(warehouse));
        when(userRepository.findById(userId)).thenReturn(Optional.of(new User()));
        
        Product advanceProd = new Product();
        VatRate vat = new VatRate();
        vat.setRate(BigDecimal.ZERO);
        advanceProd.setVatRate(vat);
        
        when(productRepository.findByProductTypeCode("ADVANCE")).thenReturn(List.of(advanceProd));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        PaymentMethod pm = new PaymentMethod();
        pm.setCode("CASH");
        when(paymentMethodRepository.findByCode(pmCode)).thenReturn(Optional.of(pm));

        when(receiptRepository.save(any(Receipt.class))).thenAnswer(i -> {
            Receipt r = i.getArgument(0);
            r.setId(778);
            return r;
        });

        receiptService.registerAdvancePayment(warehouseId, amount, pmCode, userId, null);

        verify(receiptRepository).save(argThat(r -> 
            r.getTotalNet().compareTo(amount) == 0 &&
            r.getTotalVat().compareTo(BigDecimal.ZERO) == 0
        ));
    }

    @Test
    @DisplayName("registerAdvancePayment - Eroare: Produs Avans neconfigurat")
    void registerAdvancePayment_Fail_NoProduct() {
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(userRepository.findById(1)).thenReturn(Optional.of(new User()));
        when(productRepository.findByProductTypeCode("ADVANCE")).thenReturn(List.of()); 

        assertThrows(RuntimeException.class, () -> 
            receiptService.registerAdvancePayment(1, BigDecimal.TEN, "CASH", 1, "Advance payment")
        );
    }

    @Test
    @DisplayName("registerAdvancePayment - Eroare: Cantitate invalida")
    void registerAdvancePayment_Fail_InvalidAmount() {
        assertThrows(RuntimeException.class, () -> 
            receiptService.registerAdvancePayment(1, BigDecimal.ZERO, "CASH", 1, "Test")
        );
        assertThrows(RuntimeException.class, () -> 
            receiptService.registerAdvancePayment(1, new BigDecimal("-10.00"), "CASH", 1, "Test")
        );
    }

    @Test
    @DisplayName("registerAdvancePayment - Eroare: Warehouse ID necesar")
    void registerAdvancePayment_Fail_NoWarehouseId() {
        assertThrows(RuntimeException.class, () -> 
            receiptService.registerAdvancePayment(null, BigDecimal.TEN, "CASH", 1, "Test")
        );
    }

    // --- 14. changeReceiptWarehouse ---
    @Test
    @DisplayName("changeReceiptWarehouse - Succes: Muta bonul simplu si actualizeaza stocul")
    void changeReceiptWarehouse_Success_SimpleProduct() {
        receipt.setStatus(closedStatus);
        receipt.setNote("Nota initiala");

        Product product = new Product();
        product.setId(10);
        product.setName("Apa");
        product.setTrackStock(true);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(new BigDecimal("2.00"))
                .build();
        receipt.setItems(List.of(item));

        Warehouse newWarehouse = new Warehouse();
        newWarehouse.setId(2);
        newWarehouse.setName("Bar");

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(warehouseRepository.findById(2)).thenReturn(Optional.of(newWarehouse));
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(10)).thenReturn(List.of());
        when(stockCurrentService.getQuantity(2, 10)).thenReturn(new BigDecimal("20.00"));

        receiptService.changeReceiptWarehouse(100, 2);

        assertEquals(2, receipt.getWarehouse().getId());
        assertTrue(receipt.getNote().contains("sch gest"));
        verify(stockCurrentService).updateStockRelative(eq(1), eq(10), eq(new BigDecimal("2.00")));
        verify(stockCurrentService).updateStockRelative(eq(2), eq(10), eq(new BigDecimal("-2.00")));
        verify(receiptRepository).save(receipt);
    }

    @Test
    @DisplayName("changeReceiptWarehouse - Eroare: Bonul nu este CLOSED")
    void changeReceiptWarehouse_Fail_NotClosed() {
        receipt.setStatus(openStatus);
        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> receiptService.changeReceiptWarehouse(100, 2));

        assertEquals("ERROR.RECEIPT.NOT_CLOSED", ex.getMessage());
        verify(warehouseRepository, never()).findById(any());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("changeReceiptWarehouse - Eroare: Stoc insuficient in gestiunea noua")
    void changeReceiptWarehouse_Fail_InsufficientStock() {
        receipt.setStatus(closedStatus);

        Product product = new Product();
        product.setId(11);
        product.setName("Cafea");
        product.setTrackStock(true);

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .quantity(new BigDecimal("5.00"))
                .build();
        receipt.setItems(List.of(item));

        Warehouse newWarehouse = new Warehouse();
        newWarehouse.setId(2);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(warehouseRepository.findById(2)).thenReturn(Optional.of(newWarehouse));
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(11)).thenReturn(List.of());
        when(stockCurrentService.getQuantity(2, 11)).thenReturn(new BigDecimal("1.00"));

        InsufficientStockException ex = assertThrows(
                InsufficientStockException.class,
                () -> receiptService.changeReceiptWarehouse(100, 2));

        assertTrue(ex.getProductNames().contains("Cafea"));
        verify(stockCurrentService, never()).updateStockRelative(any(), any(), any());
        verify(receiptRepository, never()).save(any());
    }

    @Test
    @DisplayName("changeReceiptWarehouse - Succes: Produs compus muta stocul componentelor")
    void changeReceiptWarehouse_Success_CompositeProduct() {
        receipt.setStatus(closedStatus);

        Product parent = new Product();
        parent.setId(20);
        parent.setName("Meniu");
        parent.setTrackStock(false);

        Product child = new Product();
        child.setId(21);
        child.setName("Cartofi");
        child.setTrackStock(true);

        ProductComponent component = ProductComponent.builder()
                .parentProduct(parent)
                .childProduct(child)
                .quantity(new BigDecimal("1.500"))
                .isActive(true)
                .build();

        ReceiptItem item = ReceiptItem.builder()
                .product(parent)
                .quantity(new BigDecimal("2.00"))
                .build();
        receipt.setItems(List.of(item));

        Warehouse newWarehouse = new Warehouse();
        newWarehouse.setId(2);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(warehouseRepository.findById(2)).thenReturn(Optional.of(newWarehouse));
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(20)).thenReturn(List.of(component));
        when(stockCurrentService.getQuantity(2, 21)).thenReturn(new BigDecimal("10.00"));

        receiptService.changeReceiptWarehouse(100, 2);

        verify(stockCurrentService).updateStockRelative(
                eq(1),
                eq(21),
                argThat(qty -> qty.compareTo(new BigDecimal("3.00")) == 0));
        verify(stockCurrentService).updateStockRelative(
                eq(2),
                eq(21),
                argThat(qty -> qty.compareTo(new BigDecimal("-3.00")) == 0));
        verify(receiptRepository).save(receipt);
    }

        @Test
        @DisplayName("changeReceiptWarehouse - Succes: Produs compus ignora componentele fara trackStock")
        void changeReceiptWarehouse_Success_CompositeProduct_OnlyTrackedChildrenUpdated() {
        receipt.setStatus(closedStatus);

        Product parent = new Product();
        parent.setId(30);
        parent.setName("Pachet");

        Product trackedChild = new Product();
        trackedChild.setId(31);
        trackedChild.setName("Suc");
        trackedChild.setTrackStock(true);

        Product untrackedChild = new Product();
        untrackedChild.setId(32);
        untrackedChild.setName("Servire");
        untrackedChild.setTrackStock(false);

        ProductComponent trackedComponent = ProductComponent.builder()
            .parentProduct(parent)
            .childProduct(trackedChild)
            .quantity(new BigDecimal("2.000"))
            .isActive(true)
            .build();

        ProductComponent untrackedComponent = ProductComponent.builder()
            .parentProduct(parent)
            .childProduct(untrackedChild)
            .quantity(new BigDecimal("1.000"))
            .isActive(true)
            .build();

        ReceiptItem item = ReceiptItem.builder()
            .product(parent)
            .quantity(new BigDecimal("3.00"))
            .build();
        receipt.setItems(List.of(item));

        Warehouse newWarehouse = new Warehouse();
        newWarehouse.setId(2);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(warehouseRepository.findById(2)).thenReturn(Optional.of(newWarehouse));
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(30))
            .thenReturn(List.of(trackedComponent, untrackedComponent));
        when(stockCurrentService.getQuantity(2, 31)).thenReturn(new BigDecimal("20.00"));

        receiptService.changeReceiptWarehouse(100, 2);

        verify(stockCurrentService).getQuantity(2, 31);
        verify(stockCurrentService, never()).getQuantity(2, 32);

        verify(stockCurrentService).updateStockRelative(
            eq(1),
            eq(31),
            argThat(qty -> qty.compareTo(new BigDecimal("6.00")) == 0));
        verify(stockCurrentService).updateStockRelative(
            eq(2),
            eq(31),
            argThat(qty -> qty.compareTo(new BigDecimal("-6.00")) == 0));

        verify(stockCurrentService, never()).updateStockRelative(anyInt(), eq(32), any());
        verify(receiptRepository).save(receipt);
        }

        @Test
        @DisplayName("changeReceiptWarehouse - Eroare: Stoc insuficient pe componenta trackStock")
        void changeReceiptWarehouse_Fail_InsufficientStockOnCompositeChild() {
        receipt.setStatus(closedStatus);

        Product parent = new Product();
        parent.setId(40);
        parent.setName("Burger Combo");

        Product child = new Product();
        child.setId(41);
        child.setName("Cartofi");
        child.setTrackStock(true);

        ProductComponent component = ProductComponent.builder()
            .parentProduct(parent)
            .childProduct(child)
            .quantity(new BigDecimal("1.500"))
            .isActive(true)
            .build();

        ReceiptItem item = ReceiptItem.builder()
            .product(parent)
            .quantity(new BigDecimal("2.00"))
            .build();
        receipt.setItems(List.of(item));

        Warehouse newWarehouse = new Warehouse();
        newWarehouse.setId(2);

        when(receiptRepository.findById(100)).thenReturn(Optional.of(receipt));
        when(warehouseRepository.findById(2)).thenReturn(Optional.of(newWarehouse));
        when(productComponentRepository.findByParentProductIdAndIsActiveTrue(40)).thenReturn(List.of(component));
        when(stockCurrentService.getQuantity(2, 41)).thenReturn(new BigDecimal("2.99"));

        InsufficientStockException ex = assertThrows(
            InsufficientStockException.class,
            () -> receiptService.changeReceiptWarehouse(100, 2));

        assertTrue(ex.getProductNames().contains("Cartofi"));
        verify(stockCurrentService, never()).updateStockRelative(anyInt(), anyInt(), any());
        verify(receiptRepository, never()).save(any());
        }
}
package com.sellbit.domain.sales.receiptpayment;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethodRepository;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceiptPaymentServiceTest {

    @Mock private ReceiptPaymentRepository paymentRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private PaymentMethodRepository paymentMethodRepository;
    @Mock private CashMovementService cashMovementService;

    @InjectMocks
    private ReceiptPaymentService paymentService;

    private Receipt receipt;
    private PaymentMethod cashMethod;
    private PaymentMethod cardMethod;

    @BeforeEach
    void setUp() {
        receipt = Receipt.builder()
                .id(10)
                .totalAmount(new BigDecimal("100.00"))
                .status(new ReceiptStatus())
                .warehouse(new Warehouse())
                .payments(new ArrayList<>())
                .build();
        receipt.getStatus().setCode("OPEN");
        receipt.getWarehouse().setId(1);

        cashMethod = PaymentMethod.builder().id(1).code("CASH").label("Numerar").build();
        cardMethod = PaymentMethod.builder().id(2).code("CARD").label("Card Bancar").build();
    }

    // --- Teste addPayment ---

    @Test
    @DisplayName("addPayment - Succes CASH: Înregistrează suma maximă necesară dacă se dă mai mult")
    void addPayment_Cash_RegistersOnlyRemaining() {
        when(receiptRepository.findById(10)).thenReturn(Optional.of(receipt));
        when(paymentMethodRepository.findById(1)).thenReturn(Optional.of(cashMethod));

        // Clientul dă 150 lei, dar bonul e de 100. Trebuie să înregistreze 100.
        paymentService.addPayment(10, 1, new BigDecimal("150.00"), 99);

        verify(paymentRepository).save(argThat(p -> 
            p.getAmount().compareTo(new BigDecimal("100.00")) == 0));
        verify(cashMovementService).createMovement(eq(1), eq("SALE"), eq(new BigDecimal("100.00")), eq(99), anyString());
    }

    @Test
    @DisplayName("addPayment - Eroare CARD: Suma depășește totalul bonului")
    void addPayment_Card_Fail_ExceedsTotal() {
        when(receiptRepository.findById(10)).thenReturn(Optional.of(receipt));
        when(paymentMethodRepository.findById(2)).thenReturn(Optional.of(cardMethod));

        // Cardul nu permite "rest", deci 100.01 e invalid
        assertThrows(RuntimeException.class, () -> 
            paymentService.addPayment(10, 2, new BigDecimal("100.01"), 99));
    }

    @Test
    @DisplayName("addPayment - Eroare: Bonul nu este OPEN")
    void addPayment_Fail_NotOpen() {
        receipt.getStatus().setCode("CLOSED");
        when(receiptRepository.findById(10)).thenReturn(Optional.of(receipt));

        assertThrows(RuntimeException.class, () -> 
            paymentService.addPayment(10, 1, BigDecimal.TEN, 99));
    }

    // --- Teste removePayment ---

    @Test
    @DisplayName("removePayment - Succes: Șterge plata și scade din sertar dacă e CASH")
    void removePayment_Success_Cash() {
        ReceiptPayment payment = ReceiptPayment.builder()
                .id(500).amount(new BigDecimal("50.00"))
                .paymentMethod(cashMethod).receipt(receipt).build();

        when(paymentRepository.findById(500)).thenReturn(Optional.of(payment));

        paymentService.removePayment(500, 99);

        // Trebuie să creeze o mișcare de REFUND pentru a scădea banii
        verify(cashMovementService).createMovement(eq(1), eq("REFUND"), eq(new BigDecimal("50.00")), eq(99), anyString());
        verify(paymentRepository).delete(payment);
    }

    @Test
    @DisplayName("removePayment - Succes: Șterge plata CARD fără a umbla la CashDrawer")
    void removePayment_Success_Card() {
        ReceiptPayment payment = ReceiptPayment.builder()
                .id(501).amount(new BigDecimal("50.00"))
                .paymentMethod(cardMethod).receipt(receipt).build();

        when(paymentRepository.findById(501)).thenReturn(Optional.of(payment));

        paymentService.removePayment(501, 99);

        verify(cashMovementService, never()).createMovement(any(), any(), any(), any(), any());
        verify(paymentRepository).delete(payment);
    }

    // --- Teste getPaymentsByReceipt ---

    @Test
    @DisplayName("getPaymentsByReceipt - Succes: Mapare corectă la Record-ul Response")
    void getPaymentsByReceipt_Success() {
        ReceiptPayment payment = ReceiptPayment.builder()
                .id(1).amount(new BigDecimal("20.00"))
                .paymentMethod(cashMethod).build();

        when(paymentRepository.findByReceiptId(10)).thenReturn(List.of(payment));

        var result = paymentService.getPaymentsByReceipt(10);

        assertEquals(1, result.size());
        assertEquals("Numerar", result.get(0).paymentMethodName());
        assertTrue(new BigDecimal("20.00").compareTo(result.get(0).amount()) == 0);
    }

    // --- Teste getPaymentsReport ---

    @Test
    @DisplayName("getPaymentsReport - Succes: Calculeaza totalul pentru o metoda specifica")
    void getPaymentsReport_Success_WithMethod() {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        String method = "CASH";
        BigDecimal expectedTotal = new BigDecimal("1100.00");

        when(paymentRepository.calculatePaymentsSum(start, end, method, null)).thenReturn(expectedTotal);

        // Act
        List<ReceiptPaymentDTO.ReportResponse> result = paymentService.getPaymentsReport(start, end, method, null);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals(expectedTotal, result.get(0).totalAmount());
        assertEquals("CASH", result.get(0).methodCode());
        assertEquals(start, result.get(0).start());
        assertEquals(end, result.get(0).end());
        
        verify(paymentRepository).calculatePaymentsSum(start, end, method, null);
    }

    @Test
    @DisplayName("getPaymentsReport - Succes: Returnează total general când metoda este null")
    void getPaymentsReport_Success_AllMethods() {
        // Arrange
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now();
        
        PaymentMethod method1 = PaymentMethod.builder().id(1).code("CASH").label("Numerar").build();
        PaymentMethod method2 = PaymentMethod.builder().id(2).code("CARD").label("Card").build();
        
        when(paymentMethodRepository.findAll()).thenReturn(List.of(method1, method2));
        when(paymentRepository.calculatePaymentsSum(start, end, "CASH", null)).thenReturn(new BigDecimal("1000.00"));
        when(paymentRepository.calculatePaymentsSum(start, end, "CARD", null)).thenReturn(new BigDecimal("1000.00"));

        // Act
        List<ReceiptPaymentDTO.ReportResponse> result = paymentService.getPaymentsReport(start, end, null, null);

        // Assert
        assertEquals(2, result.size());
        assertEquals(new BigDecimal("1000.00"), result.get(0).totalAmount());
        assertEquals("CASH", result.get(0).methodCode());
    }

    @Test
    @DisplayName("getPaymentsReport - Caz Limitant: Interval de timp inversat (start dupa end)")
    void getPaymentsReport_StartAfterEnd_ReturnsZero() {
        // Arrange
        LocalDateTime start = LocalDateTime.now().plusDays(1);
        LocalDateTime end = LocalDateTime.now();
        
        // Repository va returna 0 deoarece BETWEEN nu va gasi nimic
        when(paymentRepository.calculatePaymentsSum(start, end, "CASH", null)).thenReturn(BigDecimal.ZERO);

        // Act
        List<ReceiptPaymentDTO.ReportResponse> result = paymentService.getPaymentsReport(start, end, "CASH", null);

        // Assert
        assertEquals(1, result.size());
        assertEquals(BigDecimal.ZERO, result.get(0).totalAmount());
        
        verify(paymentRepository).calculatePaymentsSum(start, end, "CASH", null);
    }

    @Test
    @DisplayName("getPaymentsReport - Caz Limitant: Metoda de plata inexistenta")
    void getPaymentsReport_InvalidMethod_ReturnsZero() {
        // Arrange
        String invalidMethod = "NON_EXISTENT";
        
        when(paymentRepository.calculatePaymentsSum(any(), any(), eq(invalidMethod), any())).thenReturn(BigDecimal.ZERO);

        // Act
        List<ReceiptPaymentDTO.ReportResponse> result = paymentService.getPaymentsReport(LocalDateTime.now(), LocalDateTime.now(), invalidMethod, null);

        // Assert
        assertEquals(1, result.size());
        assertEquals(BigDecimal.ZERO, result.get(0).totalAmount());
    }
}
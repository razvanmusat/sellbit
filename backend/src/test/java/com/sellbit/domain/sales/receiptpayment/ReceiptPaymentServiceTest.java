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
}
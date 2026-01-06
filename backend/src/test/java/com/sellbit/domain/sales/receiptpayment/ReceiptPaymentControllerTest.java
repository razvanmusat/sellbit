package com.sellbit.domain.sales.receiptpayment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReceiptPaymentController.class)
@AutoConfigureMockMvc(addFilters = false) // Dezactivăm Security pentru 401
class ReceiptPaymentControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private ReceiptPaymentService paymentService;

    // --- POST /api/sales/receipt-payments ---
    @Test
    @DisplayName("POST / - Succes: Adăugare plată")
    void addPayment_Success() throws Exception {
        doNothing().when(paymentService).addPayment(anyInt(), anyInt(), any(BigDecimal.class), anyInt());

        mockMvc.perform(post("/api/sales/receipt-payments")
                .param("receiptId", "10")
                .param("paymentMethodId", "1")
                .param("amount", "100.00")
                .param("userId", "99"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST / - Fail: Parametri lipsă")
    void addPayment_Fail_MissingParams() throws Exception {
        mockMvc.perform(post("/api/sales/receipt-payments")
                .param("receiptId", "10"))
                .andExpect(status().isBadRequest());
    }

    // --- DELETE /api/sales/receipt-payments/{id} ---
    @Test
    @DisplayName("DELETE /{id} - Succes")
    void removePayment_Success() throws Exception {
        doNothing().when(paymentService).removePayment(500, 99);

        mockMvc.perform(delete("/api/sales/receipt-payments/500")
                .param("userId", "99"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /{id} - Fail: Lipsește userId (obligatoriu pentru sync CashDrawer)")
    void removePayment_Fail_NoUser() throws Exception {
        mockMvc.perform(delete("/api/sales/receipt-payments/500"))
                .andExpect(status().isBadRequest());
    }

    // --- GET /api/sales/receipt-payments/receipt/{receiptId} ---
    @Test
    @DisplayName("GET /receipt/{id} - Succes")
    void getPayments_Success() throws Exception {
        when(paymentService.getPaymentsByReceipt(10)).thenReturn(List.of());

        mockMvc.perform(get("/api/sales/receipt-payments/receipt/10"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
}
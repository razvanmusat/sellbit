package com.sellbit.domain.sales.receiptpayment;

import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReceiptPaymentController.class)
@AutoConfigureMockMvc(addFilters = false) // Dezactivăm Security pentru a evita 401 în teste unitare
class ReceiptPaymentControllerTest {

    @Autowired 
    private MockMvc mockMvc;

    @MockitoBean 
    private ReceiptPaymentService paymentService;

    // Mock-uri obligatorii pentru satisfacerea constructorului JwtAuthenticationFilter
    @MockitoBean 
    private JwtUtils jwtUtils;

    @MockitoBean 
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;   

    // --- POST /api/sales/receipt-payments ---
        @Test
        @DisplayName("POST / - Succes: Adăugare plată")
        void addPayment_Success() throws Exception {
                doNothing().when(paymentService).addPayment(anyInt(), anyInt(), any(BigDecimal.class), anyInt(), any());

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

    // --- Teste Succes Rapoarte ---

    @Test
    @DisplayName("GET /report/sum - Succes: Returnează totalul corect")
    void getPaymentsReport_Success() throws Exception {
        LocalDateTime start = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 1, 31, 23, 59);
        ReceiptPaymentDTO.ReportResponse mockResponse = new ReceiptPaymentDTO.ReportResponse(
                new BigDecimal("1100.00"), "CASH", start, end);

        // Returnează o listă cu obiecte ReportResponse
        when(paymentService.getPaymentsReport(any(), any(), eq("CASH"), any())).thenReturn(List.of(mockResponse));

        mockMvc.perform(get("/api/sales/receipt-payments/report/sum")
                .param("start", "2026-01-01T00:00:00")
                .param("end", "2026-01-31T23:59:59")
                .param("methodCode", "CASH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].total").value(1100.00))
                .andExpect(jsonPath("$[0].methodCode").value("CASH"));
    }

    @Test
    @DisplayName("GET /report/sum - Succes: Funcționează fără methodCode (null)")
    void getPaymentsReport_NullMethod_Success() throws Exception {
        LocalDateTime start = LocalDateTime.of(2026, 1, 1, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 1, 31, 23, 59);
        // Returnează o listă cu obiecte ReportResponse
        when(paymentService.getPaymentsReport(any(), any(), isNull(), any())).thenReturn(
                List.of(new ReceiptPaymentDTO.ReportResponse(BigDecimal.TEN, null, start, end)));

        mockMvc.perform(get("/api/sales/receipt-payments/report/sum")
                .param("start", "2026-01-01T00:00:00")
                .param("end", "2026-01-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].total").value(10.00))
                .andExpect(jsonPath("$[0].methodCode").isEmpty());
    }

    // --- Teste Date Eronate ---

    @Test
    @DisplayName("GET /report/sum - Fail: Format dată invalid")
    void getPaymentsReport_InvalidDateFormat() throws Exception {
        mockMvc.perform(get("/api/sales/receipt-payments/report/sum")
                .param("start", "01-01-2026") // Format greșit, așteaptă ISO
                .param("end", "2026-01-31T23:59:59"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /report/sum - Fail: Lipsă parametru obligatoriu (start)")
    void getPaymentsReport_MissingStartParam() throws Exception {
        mockMvc.perform(get("/api/sales/receipt-payments/report/sum")
                .param("end", "2026-01-31T23:59:59"))
                .andExpect(status().isBadRequest());
    }
}
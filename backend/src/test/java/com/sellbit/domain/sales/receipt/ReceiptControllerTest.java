package com.sellbit.domain.sales.receipt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
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

@WebMvcTest(
        controllers = ReceiptController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
class ReceiptControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    
    @MockitoBean private ReceiptService receiptService;

    // Mock-uri necesare pentru pornirea contextului (satisfac JwtAuthenticationFilter)
    @MockitoBean private JwtUtils jwtUtils;
    @MockitoBean private UserDetailsService userDetailsService;
    
    @MockitoBean
    private PasswordEncoder passwordEncoder;   

    // --- 1. CREATE ---
    @Test
    @DisplayName("POST /api/sales/receipts - Succes: Creare bon")
    void create_Success() throws Exception {
        var req = new ReceiptDTOs.CreateRequest(1, "Masa 5", 1, "Nota test");
        
        var res = new ReceiptDTOs.Response(
                1, "Deschis", "Masa: Masa 5", 
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 
                "Central", 
                1, 
                "Admin", LocalDateTime.now(), null, "Nota test", null, null,
                List.of(), // items
                List.of()  // payments
        );

        when(receiptService.createReceipt(any())).thenReturn(res);

        mockMvc.perform(post("/api/sales/receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.warehouseId").value(1))
                .andExpect(jsonPath("$.statusLabel").value("Deschis"))
                .andExpect(jsonPath("$.tableName").value("Masa: Masa 5"));
    }

    @Test
    @DisplayName("POST /api/sales/receipts - Eroare: Validare @NotBlank tableName")
    void create_Fail_Validation() throws Exception {
        var req = new ReceiptDTOs.CreateRequest(1, "", 1, null);

        mockMvc.perform(post("/api/sales/receipts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- 2. ALERTS ---
    @Test
    @DisplayName("GET /api/sales/receipts/alerts - Succes: Lista alerte")
    void getAlerts_Success() throws Exception {
        var alert = new ReceiptDTOs.UnclosedAlert(1, "Masa 1", LocalDateTime.now().minusDays(1), "Central");
        when(receiptService.getUnclosedAlerts()).thenReturn(List.of(alert));

        mockMvc.perform(get("/api/sales/receipts/alerts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tableName").value("Masa 1"))
                .andExpect(jsonPath("$[0].warehouseName").value("Central"));
    }

    // --- 3. CANCEL ---
    @Test
    @DisplayName("PATCH /api/sales/receipts/{id}/cancel - Succes")
    void cancel_Success() throws Exception {
        doNothing().when(receiptService).cancelOpenReceipt(100, 1);

        mockMvc.perform(patch("/api/sales/receipts/100/cancel")
                        .param("reasonId", "1"))
                .andExpect(status().isNoContent());
        
        verify(receiptService).cancelOpenReceipt(100, 1);
    }

    // --- 4. CLOSE ---
    @Test
    @DisplayName("POST /api/sales/receipts/{id}/close - Succes")
    void close_Success() throws Exception {
        doNothing().when(receiptService).closeReceipt(100);

        mockMvc.perform(post("/api/sales/receipts/100/close"))
                .andExpect(status().isOk());
        
        verify(receiptService).closeReceipt(100);
    }

    // --- 5. REFUND (STORNARE) ---
    @Test
    @DisplayName("POST /api/sales/receipts/{id}/refund - Succes: Valorile negative din Response")
    void refund_Success() throws Exception {
        var itemReq = new ReceiptDTOs.RefundItemRequest(1, new BigDecimal("1.00"));
        var refundReq = new ReceiptDTOs.RefundRequest(1, List.of(itemReq), 1);
        
        var response = new ReceiptDTOs.Response(
                101, "Inchis", "Stornare la Bon #100", 
                new BigDecimal("-50.00"), new BigDecimal("-42.00"), new BigDecimal("-8.00"), 
                "Central", 
                1, 
                "Admin", LocalDateTime.now(), LocalDateTime.now(), null, null, 100,
                List.of(), // items
                List.of()  // payments
        );

        when(receiptService.createPartialRefund(eq(100), any())).thenReturn(response);

        mockMvc.perform(post("/api/sales/receipts/100/refund")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(refundReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tableName").value("Stornare la Bon #100"))
                .andExpect(jsonPath("$.totalAmount").value(-50.00))
                .andExpect(jsonPath("$.warehouseId").value(1))
                .andExpect(jsonPath("$.statusLabel").value("Inchis"))
                .andExpect(jsonPath("$.originalReceiptId").value(100));
    }

    // --- 6. PROFIT REPORT ---
    @Test
    @DisplayName("GET /api/sales/receipts/reports/profit - Succes: Verifică returnare sumă")
    void getProfit_Success() throws Exception {
        // MODIFICAT: Acum acceptă 3 argumente (start, end, warehouseId)
        // warehouseId vine null din request, deci any() îl acoperă
        when(receiptService.getGrossProfitReport(any(), any(), any())).thenReturn(new BigDecimal("100.00"));

        mockMvc.perform(get("/api/sales/receipts/reports/profit")
                        .param("start", "2026-01-01T00:00:00")
                        .param("end", "2026-01-05T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(content().string("100.00"));
    }

    @Test
    @DisplayName("GET /api/sales/receipts/reports/profit - Eroare: Format dată invalid")
    void getProfit_Fail_InvalidDate() throws Exception {
        mockMvc.perform(get("/api/sales/receipts/reports/profit")
                        .param("start", "not-a-date")
                        .param("end", "2026-01-05T23:59:59"))
                .andExpect(status().isBadRequest());
    }

    // --- 7. ACTIVE RECEIPTS (LIVE UI) ---
    @Test
    @DisplayName("GET /api/sales/receipts/active - Succes: Returnează lista de mese active")
    void getActive_Success() throws Exception {
        var response = new ReceiptDTOs.Response(
                1, "Deschis", "Masa: Masa 10", 
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 
                "Central", 
                1, 
                "Admin", LocalDateTime.now(), null, null, null, null,
                List.of(), // items
                List.of()  // payments
        );

        when(receiptService.getActiveReceipts(1)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/sales/receipts/active")
                        .param("warehouseId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tableName").value("Masa: Masa 10"))
                .andExpect(jsonPath("$[0].warehouseId").value(1));
    }

    @Test
    @DisplayName("GET /api/sales/receipts/active - Eroare: Lipsește parametrul warehouseId")
    void getActive_Fail_MissingParam() throws Exception {
        mockMvc.perform(get("/api/sales/receipts/active"))
                .andExpect(status().isBadRequest());
    }

    // --- 8. REPORT (HISTORY) ---
    @Test
    @DisplayName("GET /api/sales/receipts/report - Succes: Returnează istoricul filtrat")
    void getReport_Success() throws Exception {
        var response = new ReceiptDTOs.Response(
                100, "Inchis", "Masa: Masa 5", 
                new BigDecimal("150.00"), new BigDecimal("126.00"), new BigDecimal("24.00"), 
                "Central", 
                1, 
                "Admin", LocalDateTime.now().minusDays(1), LocalDateTime.now(), null, null, null,
                List.of(), // items
                List.of()  // payments
        );

        when(receiptService.getReceiptsReport(eq(1), eq("CLOSED"), any(), any()))
                .thenReturn(List.of(response));

        mockMvc.perform(get("/api/sales/receipts/report")
                        .param("warehouseId", "1")
                        .param("status", "CLOSED")
                        .param("start", "2026-01-01T00:00:00")
                        .param("end", "2026-01-05T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(100))
                .andExpect(jsonPath("$[0].warehouseId").value(1))
                .andExpect(jsonPath("$[0].totalAmount").value(150.00));
    }

    @Test
    @DisplayName("GET /api/sales/receipts/report - Eroare: Format dată invalid (ISO necesar)")
    void getReport_Fail_DateFormat() throws Exception {
        mockMvc.perform(get("/api/sales/receipts/report")
                        .param("warehouseId", "1")
                        .param("status", "CLOSED")
                        .param("start", "2026-01-01") 
                        .param("end", "2026-01-05"))
                .andExpect(status().isBadRequest());
    }

    // --- 9. PRINT BILL NOTE ---
    @Test
    @DisplayName("GET /api/sales/receipts/{id}/print-bill-note - Succes: Returnează datele de printare")
    void getBillNoteForPrint_Success() throws Exception {
        var printData = new ReceiptPrintDTO(
                "SellBit Store", "Strada Test 1", "RO123456",
                List.of(), null, null,
                new BigDecimal("100.00"), 
                new BigDecimal("20.00"), 
                new BigDecimal("80.00"), 
                LocalDateTime.now()
        );

        when(receiptService.getBillNoteData(100)).thenReturn(printData);

        mockMvc.perform(get("/api/sales/receipts/100/print-bill-note"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.storeName").value("SellBit Store"))
                .andExpect(jsonPath("$.totalToPay").value(80.00));
    }

    @Test
    @DisplayName("GET /api/sales/receipts/{id}/print-bill-note - Eroare: Bon inexistent")
    void getBillNoteForPrint_Fail_NotFound() throws Exception {
        when(receiptService.getBillNoteData(999))
            .thenThrow(new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        mockMvc.perform(get("/api/sales/receipts/999/print-bill-note"))
                .andExpect(status().isBadRequest()); 
    }

    // --- 11. ADVANCE PAYMENT (INCASARE AVANS) ---
    @Test
    @DisplayName("POST /api/sales/receipts/advance - Succes: Înregistrare avans")
    void registerAdvance_Success() throws Exception {
        var req = new ReceiptDTOs.AdvancePaymentRequest(1, new BigDecimal("100.00"), "CASH", 1, "Avans client");

        // Controllerul apeleaza metoda void a serviciului cu 5 argumente
        doNothing().when(receiptService).registerAdvancePayment(anyInt(), any(), anyString(), anyInt(), anyString());

        mockMvc.perform(post("/api/sales/receipts/advance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
        
        verify(receiptService).registerAdvancePayment(1, new BigDecimal("100.00"), "CASH", 1, "Avans client");
    }

    @Test
    @DisplayName("POST /api/sales/receipts/advance - Eroare: Validare")
    void registerAdvance_Fail_Validation() throws Exception {
        // Lipseste amount si paymentMethodCode
        var req = new ReceiptDTOs.AdvancePaymentRequest(1, null, null, 1, null);

        mockMvc.perform(post("/api/sales/receipts/advance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
package com.sellbit.domain.sales.receiptitem;

import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ReceiptItemController.class)
@AutoConfigureMockMvc(addFilters = false)
class ReceiptItemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReceiptItemService receiptItemService;

    // Mock-uri pentru securitate
    @MockitoBean
    private JwtUtils jwtUtils;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private PasswordEncoder passwordEncoder;

    // --- POST /api/sales/receipt-items/sync ---

    @Test
    @DisplayName("POST /sync - Succes: Adăugare produs")
    void syncItem_Success() throws Exception {
        // Returnăm null sau un obiect dummy, controller-ul verifică doar status 200 aici
        when(receiptItemService.addOrUpdateItem(anyInt(), anyInt(), any(BigDecimal.class)))
                .thenReturn(null);

        mockMvc.perform(post("/api/sales/receipt-items/sync")
                .param("receiptId", "100")
                .param("productId", "50")
                .param("quantity", "2.5"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /sync - Eroare: Lipsă parametru obligatoriu")
    void syncItem_Fail_MissingParam() throws Exception {
        mockMvc.perform(post("/api/sales/receipt-items/sync")
                .param("receiptId", "100")) // Lipsește productId și quantity
                .andExpect(status().isBadRequest());
    }

    // --- DELETE /api/sales/receipt-items/{itemId} ---

    @Test
    @DisplayName("DELETE /{itemId} - Succes")
    void removeItem_Success() throws Exception {
        when(receiptItemService.removeItem(500)).thenReturn(null);

        mockMvc.perform(delete("/api/sales/receipt-items/500"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /{itemId} - Eroare: ID format greșit")
    void removeItem_Fail_WrongFormat() throws Exception {
        mockMvc.perform(delete("/api/sales/receipt-items/not-a-number"))
                .andExpect(status().isBadRequest());
    }

    // --- GET /api/sales/receipt-items/receipt/{receiptId} ---

    @Test
    @DisplayName("GET /receipt/{receiptId} - Succes: Returnează itemele cu structura nouă")
    void getItems_Success() throws Exception {
        // ACTUALIZAT: Constructorul include acum remainingQuantity
        var response = new ReceiptItemDTO.ReceiptItemResponse(
                1,                      // id
                50,                     // productId
                "Produs Standard",      // productName
                new BigDecimal("5.00"), // quantity (original)
                new BigDecimal("5.00"), // remainingQuantity (identic pt bon deschis)
                new BigDecimal("10.00"),// unitPrice
                new BigDecimal("19.00"),// vatRate
                new BigDecimal("50.00"),// lineTotal
                new BigDecimal("42.02"),// netTotal
                new BigDecimal("7.98")  // vatTotal
        );

        when(receiptItemService.getItemsByReceipt(100)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/sales/receipt-items/receipt/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Produs Standard"))
                .andExpect(jsonPath("$[0].quantity").value(5.00))
                .andExpect(jsonPath("$[0].remainingQuantity").value(5.00)) // Verificăm noul câmp
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("GET /receipt/{receiptId} - Succes: Verificare Retur Parțial (Remaining < Quantity)")
    void getItems_PartialRefund_Success() throws Exception {
        // SCENARIU NOU: Produs partial stornat
        var response = new ReceiptItemDTO.ReceiptItemResponse(
                2,
                51,
                "Produs Stornat Partial",
                new BigDecimal("10.00"), // S-au cumpărat 10
                new BigDecimal("4.00"),  // Mai sunt disponibile doar 4 (6 returnate)
                new BigDecimal("10.00"),
                BigDecimal.ZERO,
                new BigDecimal("100.00"),
                new BigDecimal("100.00"),
                BigDecimal.ZERO
        );

        when(receiptItemService.getItemsByReceipt(101)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/sales/receipt-items/receipt/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Produs Stornat Partial"))
                .andExpect(jsonPath("$[0].quantity").value(10.00))
                .andExpect(jsonPath("$[0].remainingQuantity").value(4.00)); // Validăm că frontend-ul primește 4
    }

    @Test
    @DisplayName("GET /receipt/{receiptId} - Eroare: Cale invalidă")
    void getItems_Fail_WrongPath() throws Exception {
        mockMvc.perform(get("/api/sales/receipt-items/receipt/"))
                .andExpect(status().isNotFound());
    }

    // --- GET /api/sales/receipt-items/report/quantity ---

    @Test
    @DisplayName("GET /report/quantity - Succes: Returnează raport cantitativ")
    void getQuantityReport_Success() throws Exception {
        var reportLine = new ReceiptItemDTO.QuantityReportResponse(
                "Produs Test", new BigDecimal("10.00"), new BigDecimal("100.00"));

        // MODIFICAT: Acceptă 4 argumente (start, end, productIds, warehouseId)
        // warehouseId este null în acest request
        when(receiptItemService.getProductsQuantityReport(any(), any(), any(), any()))
                .thenReturn(List.of(reportLine));

        mockMvc.perform(get("/api/sales/receipt-items/report/quantity")
                .param("start", "2026-01-01T00:00:00")
                .param("end", "2026-01-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Produs Test"))
                .andExpect(jsonPath("$[0].totalQuantity").value(10.00))
                .andExpect(jsonPath("$[0].totalAmount").value(100.00));
    }

    @Test
    @DisplayName("GET /report/quantity - Succes: Filtrare după ID-uri")
    void getQuantityReport_WithIds_Success() throws Exception {
        // MODIFICAT: Acceptă 4 argumente
        when(receiptItemService.getProductsQuantityReport(any(), any(), any(), any()))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/sales/receipt-items/report/quantity")
                .param("start", "2026-01-01T00:00:00")
                .param("end", "2026-01-31T23:59:59")
                .param("productIds", "17,18,19"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /report/quantity - Fail: Format dată invalid")
    void getQuantityReport_Fail_InvalidDate() throws Exception {
        mockMvc.perform(get("/api/sales/receipt-items/report/quantity")
                .param("start", "2026/01/01")
                .param("end", "2026-01-31T23:59:59"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /report/quantity - Fail: Lipsă parametru end")
    void getQuantityReport_Fail_MissingEnd() throws Exception {
        mockMvc.perform(get("/api/sales/receipt-items/report/quantity")
                .param("start", "2026-01-01T00:00:00"))
                .andExpect(status().isBadRequest());
    }
}
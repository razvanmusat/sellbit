package com.sellbit.domain.sales.receiptitem;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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
@AutoConfigureMockMvc(addFilters = false) // Ignorăm securitatea (401)
class ReceiptItemControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private ReceiptItemService receiptItemService;

    // --- POST /api/sales/receipt-items/sync ---

    @Test
    @DisplayName("POST /sync - Succes: Adăugare produs")
    void syncItem_Success() throws Exception {
        when(receiptItemService.addOrUpdateItem(anyInt(), anyInt(), any(BigDecimal.class)))
                .thenReturn(null); // Returnăm null pentru că testăm doar statusul rutei

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
    @DisplayName("GET /receipt/{receiptId} - Succes")
    void getItems_Success() throws Exception {
        var response = new ReceiptItemDTO.ReceiptItemResponse(
                1, 50, "Produs", BigDecimal.ONE, BigDecimal.TEN, 
                BigDecimal.ZERO, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ZERO
        );

        when(receiptItemService.getItemsByReceipt(100)).thenReturn(List.of(response));

        mockMvc.perform(get("/api/sales/receipt-items/receipt/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Produs"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("GET /receipt/{receiptId} - Eroare: Cale invalidă")
    void getItems_Fail_WrongPath() throws Exception {
        mockMvc.perform(get("/api/sales/receipt-items/receipt/")) // Lipsește ID-ul în URL
                .andExpect(status().isNotFound());
    }
}
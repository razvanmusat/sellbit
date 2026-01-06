package com.sellbit.domain.inventory.purchase;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

@WebMvcTest(PurchaseController.class)
@AutoConfigureMockMvc(addFilters = false)
class PurchaseControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PurchaseService purchaseService;

    // URL-ul de bază conform controller-ului tău
    private static final String BASE_URL = "/api/inventory/purchases";

    @Test
    @DisplayName("POST: Adăugare achiziții bulk - Succes (200 OK)")
    void addPurchases_Success() throws Exception {
        PurchaseDTOs.CreateItem item = new PurchaseDTOs.CreateItem(10, 5, new BigDecimal("10.000"), new BigDecimal("50.00"), null, "Nota test");
        PurchaseDTOs.BulkCreate request = new PurchaseDTOs.BulkCreate(1, List.of(item));

        doNothing().when(purchaseService).processBulkPurchase(any(PurchaseDTOs.BulkCreate.class));

        mockMvc.perform(post(BASE_URL + "/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET: Alerte expirare - Succes și mapare JSON")
    void getExpirationAlerts_Success() throws Exception {
        PurchaseDTOs.ExpirationAlert alert = new PurchaseDTOs.ExpirationAlert(100, "Produs Test", "Depozit", BigDecimal.ONE, null, 10);
        when(purchaseService.getExpirationAlerts(anyInt())).thenReturn(List.of(alert));

        mockMvc.perform(get(BASE_URL + "/alerts/expiration")
                .param("days", "15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Produs Test"))
                .andExpect(jsonPath("$[0].daysUntilExpiration").value(10));
    }

    @Test
    @DisplayName("GET: Istoric per depozit - Succes")
    void getByWarehouse_Success() throws Exception {
        when(purchaseService.getPurchasesByWarehouse(5)).thenReturn(List.of());

        mockMvc.perform(get(BASE_URL + "/warehouse/5"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST: Eroare Validare - Request Body Invalid (400 Bad Request)")
    void addPurchases_ValidationError() throws Exception {
        // Trimitem un body gol sau invalid pentru a declanșa @Valid
        // Dacă BulkCreate are @NotNull pe listă sau user, va da 400
        String invalidJson = "{\"userId\": null, \"items\": []}";

        mockMvc.perform(post(BASE_URL + "/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
                .andExpect(status().isBadRequest());
    }
}
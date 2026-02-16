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

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private static final String BASE_URL = "/api/inventory/purchases";

    @Test
    @DisplayName("POST: Adăugare achiziții bulk - Succes (200 OK)")
    void addPurchases_Success() throws Exception {
        // CreateItem: productId, warehouseId, quantity, purchasePrice, expirationDate
        PurchaseDTOs.CreateItem item = new PurchaseDTOs.CreateItem(
            10, 5, new BigDecimal("10.000"), new BigDecimal("50.00"), null
        );
        
        // BulkCreate: userId, globalNote, items
        PurchaseDTOs.BulkCreate request = new PurchaseDTOs.BulkCreate(
            1, "Nota globala factura test", List.of(item)
        );

        doNothing().when(purchaseService).processBulkPurchase(any(PurchaseDTOs.BulkCreate.class));

        mockMvc.perform(post(BASE_URL + "/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET: Alerte expirare - Succes și mapare JSON")
    void getExpirationAlerts_Success() throws Exception {
        PurchaseDTOs.ExpirationAlert alert = new PurchaseDTOs.ExpirationAlert(
            100, "Produs Test", "Depozit", BigDecimal.ONE, null, 10
        );
        when(purchaseService.getExpirationAlerts(anyInt())).thenReturn(List.of(alert));

        mockMvc.perform(get(BASE_URL + "/alerts/expiration")
                .param("days", "15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Produs Test"))
                .andExpect(jsonPath("$[0].daysUntilExpiration").value(10));
    }    

    @Test
    @DisplayName("POST: Eroare Validare - Request Body Invalid (400 Bad Request)")
    void addPurchases_ValidationError() throws Exception {
        // Testăm validarea pe structura nouă
        String invalidJson = "{\"userId\": null, \"globalNote\": \"Test\", \"items\": []}";

        mockMvc.perform(post(BASE_URL + "/bulk")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
                .andExpect(status().isBadRequest());
    }
}
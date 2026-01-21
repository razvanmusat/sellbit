package com.sellbit.domain.inventory.stockcurrent;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
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

@WebMvcTest(StockCurrentController.class)
@AutoConfigureMockMvc(addFilters = false)
class StockCurrentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private StockCurrentService stockCurrentService;

    // Mock-uri obligatorii pentru a satisface dependințele JwtAuthenticationFilter la încărcarea contextului
    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;   

    private static final String BASE_URL = "/api/inventory/stock-current";

    // --- 1. getStockByWarehouse ---

    @Test
    @DisplayName("GET getStockByWarehouse: Valid - 200 OK")
    void getStockByWarehouse_Valid() throws Exception {
        when(stockCurrentService.getStockByWarehouse(1)).thenReturn(List.of());
        mockMvc.perform(get(BASE_URL + "/warehouse/1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET getStockByWarehouse: Invalid - ID non-numeric 400")
    void getStockByWarehouse_Invalid() throws Exception {
        mockMvc.perform(get(BASE_URL + "/warehouse/abc"))
                .andExpect(status().isBadRequest());
    }

    // --- 2. getProductStockLive ---

    @Test
    @DisplayName("GET getProductStockLive: Valid - returnează valoare numerică")
    void getProductStockLive_Valid() throws Exception {
        when(stockCurrentService.getQuantity(1, 10)).thenReturn(new BigDecimal("15.50"));
        mockMvc.perform(get(BASE_URL + "/warehouse/1/product/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(15.5));
    }

    @Test
    @DisplayName("GET getProductStockLive: Invalid - URL incomplet 404")
    void getProductStockLive_Invalid() throws Exception {
        mockMvc.perform(get(BASE_URL + "/warehouse/1/product/"))
                .andExpect(status().isNotFound());
    }

    // --- 3. setPhysicalStock (INVENTAR) ---

    @Test
    @DisplayName("POST setPhysicalStock: Valid - 200 OK")
    void setPhysicalStock_Valid() throws Exception {
        // 1. Creăm itemi
        var item1 = new StockCurrentDTOs.UpdateItem(10, new BigDecimal("50.00"));
        var item2 = new StockCurrentDTOs.UpdateItem(11, new BigDecimal("0.00"));

        // 2. Creăm request-ul cu lista
        var request = new StockCurrentDTOs.UpdateQuantity(
            1,                  // warehouseId
            "Inventar Anual",   // reason
            List.of(item1, item2) // items
        );

        doNothing().when(stockCurrentService).setPhysicalStock(any());

        mockMvc.perform(post(BASE_URL + "/physical-stock")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST setPhysicalStock: Invalid - Listă goală 400")
    void setPhysicalStock_Invalid_EmptyList() throws Exception {
        var request = new StockCurrentDTOs.UpdateQuantity(
            1, 
            "Inventar", 
            List.of() // Listă goală -> @NotEmpty aruncă eroare
        );

        mockMvc.perform(post(BASE_URL + "/physical-stock")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST setPhysicalStock: Invalid - Cantitate negativă 400")
    void setPhysicalStock_Invalid_NegativeQty() throws Exception {
        // Item cu cantitate negativă
        var itemNegative = new StockCurrentDTOs.UpdateItem(10, new BigDecimal("-5.00"));
        
        var request = new StockCurrentDTOs.UpdateQuantity(
            1, 
            "Inventar", 
            List.of(itemNegative)
        );

        mockMvc.perform(post(BASE_URL + "/physical-stock")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
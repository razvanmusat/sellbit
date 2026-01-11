package com.sellbit.domain.inventory.stockcurrent;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(StockCurrentController.class)
@AutoConfigureMockMvc(addFilters = false)
class StockCurrentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StockCurrentService stockCurrentService;

    // Mock-uri obligatorii pentru a satisface dependințele JwtAuthenticationFilter la încărcarea contextului
    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

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
}
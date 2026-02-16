package com.sellbit.domain.inventory.stockadjustment;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

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

@WebMvcTest(StockAdjustmentController.class)
@AutoConfigureMockMvc(addFilters = false)
class StockAdjustmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private StockAdjustmentService adjustmentService;

    // Mock-uri obligatorii pentru satisfacerea dependințelor JwtAuthenticationFilter
    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;    

    private static final String BASE_URL = "/api/inventory/adjustments";

    @Test
    @DisplayName("POST: Creare ajustare - Date Valide (200 OK)")
    void createAdjustment_Success() throws Exception {
        StockAdjustmentDTOs.Create dto = new StockAdjustmentDTOs.Create(1, 1, 1, 1, new BigDecimal("5.0"), "Note");
        
        doNothing().when(adjustmentService).processAdjustment(any());

        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST: Creare ajustare - Body Invalid (400 Bad Request)")
    void createAdjustment_InvalidBody() throws Exception {
        // Trimiterea unui JSON parțial (fără câmpuri obligatorii)
        String invalidJson = "{\"productId\": 1}"; 

        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET: Raport după date - Parametri Valizi")
    void getByDateRange_Success() throws Exception {
        mockMvc.perform(get(BASE_URL + "/report")
                .param("warehouseId", "1")
                .param("start", "2023-01-01")
                .param("end", "2023-01-31"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET: Raport după date - Format dată invalid (400)")
    void getByDateRange_InvalidFormat() throws Exception {
        mockMvc.perform(get(BASE_URL + "/report")
                .param("start", "01-01-2023") // Format greșit, se așteaptă ISO (YYYY-MM-DD)
                .param("end", "2023-01-31"))
                .andExpect(status().isBadRequest());
    }
}
package com.sellbit.domain.cash.cashmovement;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CashMovementController.class, excludeAutoConfiguration = {
    org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
    org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class CashMovementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private CashMovementService cashMovementService;
    @MockitoBean private CashMovementRepository cashMovementRepository;

    @Test
    @DisplayName("POST /api/cash/movements - Succes")
    void createMovement_Success() throws Exception {
        mockMvc.perform(post("/api/cash/movements")
                .param("warehouseId", "1")
                .param("typeCode", "CASH_OUT")
                .param("amount", "20.00")
                .param("userId", "1")
                .param("note", "Cafea"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/cash/movements - Fail: Tip mișcare inexistent (400 conform Handler)")
    void createMovement_Fail() throws Exception {
        doThrow(new RuntimeException("ERROR.MOVEMENT_TYPE.NOT_FOUND"))
                .when(cashMovementService).createMovement(anyInt(), anyString(), any(), anyInt(), any());

        mockMvc.perform(post("/api/cash/movements")
                .param("warehouseId", "1")
                .param("typeCode", "INVALID")
                .param("amount", "10.00")
                .param("userId", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.MOVEMENT_TYPE.NOT_FOUND"));
    }

    @Test
    @DisplayName("GET /api/cash/movements/warehouse/{id} - Succes")
    void getHistory_Success() throws Exception {
        CashMovement movement = CashMovement.builder().amount(new BigDecimal("100.00")).build();
        when(cashMovementRepository.findByWarehouseIdOrderByCreatedAtDesc(1))
                .thenReturn(List.of(movement));

        mockMvc.perform(get("/api/cash/movements/warehouse/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].amount").value(100.00));
    }
}
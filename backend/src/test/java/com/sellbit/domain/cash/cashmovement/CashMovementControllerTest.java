package com.sellbit.domain.cash.cashmovement;

import com.sellbit.domain.lookup.cashmovementtype.CashMovementType;
import com.sellbit.domain.security.auth.JwtUtils;
import com.sellbit.domain.security.user.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WithMockUser(username = "cashier")
@WebMvcTest(controllers = CashMovementController.class, excludeAutoConfiguration = {
    org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
    org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class CashMovementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean 
    private CashMovementService cashMovementService;
    
    @MockitoBean 
    private CashMovementRepository cashMovementRepository;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @Test
    @DisplayName("POST /api/cash/movements - Succes")
    void createMovement_Success() throws Exception {
        mockMvc.perform(post("/api/cash/movements")
                .param("warehouseId", "1")
                .param("typeCode", "CASH_OUT")
                .param("amount", "20.00")
                .param("note", "Cafea"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/cash/movements - Fail: Tip mișcare inexistent (400 conform Handler)")
    void createMovement_Fail() throws Exception {
        doThrow(new RuntimeException("ERROR.MOVEMENT_TYPE.NOT_FOUND"))
                .when(cashMovementService).createMovement(anyInt(), anyString(), any(BigDecimal.class), anyString(), any());

        mockMvc.perform(post("/api/cash/movements")
                .param("warehouseId", "1")
                .param("typeCode", "INVALID")
                .param("amount", "10.00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.MOVEMENT_TYPE.NOT_FOUND"));
    }

    @Test
    @DisplayName("GET /api/cash/movements/warehouse/{id} - Succes")
    void getHistory_Success() throws Exception {
        CashMovementType movementType = new CashMovementType();
        movementType.setCode("CASH_OUT");
        movementType.setLabel("Ieșire");

        User user = User.builder()
                .fullName("John Doe")
                .build();

        CashMovement movement = CashMovement.builder()
                .id(1)
                .amount(new BigDecimal("100.00"))
                .createdAt(LocalDateTime.now())
                .movementType(movementType)
                .user(user)
                .build();

        when(cashMovementRepository.findByWarehouseIdAndCreatedAtBetweenOrderByCreatedAtDesc(eq(1), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of(movement));

        mockMvc.perform(get("/api/cash/movements/warehouse/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].amount").value(100.00))
                .andExpect(jsonPath("$[0].typeCode").value("CASH_OUT"))
                .andExpect(jsonPath("$[0].typeLabel").value("Ieșire"))
                .andExpect(jsonPath("$[0].userName").value("John Doe")); // Corectat din userFullName in userName conform DTO
    }

    @Test
    @DisplayName("GET /api/cash/movements/warehouse/{id} - Filtrare cu parametri de dată")
    void getHistory_WithDateParams() throws Exception {
        when(cashMovementRepository.findByWarehouseIdAndCreatedAtBetweenOrderByCreatedAtDesc(anyInt(), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/cash/movements/warehouse/1")
                .param("from", "2026-01-01")
                .param("to", "2026-01-31"))
                .andExpect(status().isOk());
    }
}
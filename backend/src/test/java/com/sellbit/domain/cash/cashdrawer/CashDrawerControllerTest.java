package com.sellbit.domain.cash.cashdrawer;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath; // Pentru verificarea mesajului
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;

@WebMvcTest(controllers = CashDrawerController.class, excludeAutoConfiguration = {
    org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
    org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class CashDrawerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CashDrawerService cashDrawerService;

    @Test
    @DisplayName("GET /api/cash/drawer/warehouse/{id} - Succes: Returnează 200 și soldul")
    void getBalance_Success() throws Exception {
        Integer warehouseId = 1;
        CashDrawer drawer = CashDrawer.builder()
                .currentBalance(new BigDecimal("150.75"))
                .build();

        when(cashDrawerService.getOrCreateDrawer(warehouseId)).thenReturn(drawer);

        mockMvc.perform(get("/api/cash/drawer/warehouse/{warehouseId}", warehouseId))
                .andExpect(status().isOk())
                .andExpect(content().string("150.75"));
    }

    @Test
    @DisplayName("GET /api/cash/drawer/warehouse/{id} - Fail: Conform GlobalExceptionHandler returnează 400")
    void getBalance_NotFound() throws Exception {
        Integer warehouseId = 99;
        String errorMessage = "ERROR.WAREHOUSE.NOT_FOUND";

        // Simulăm excepția pe care handler-ul o va prinde
        when(cashDrawerService.getOrCreateDrawer(warehouseId))
                .thenThrow(new RuntimeException(errorMessage));

        mockMvc.perform(get("/api/cash/drawer/warehouse/{warehouseId}", warehouseId))
                .andExpect(status().isBadRequest()) // Cod 400 conform @ExceptionHandler(RuntimeException.class)
                .andExpect(jsonPath("$.message").value(errorMessage)); // Verificăm că JSON-ul are structura corectă
    }
}
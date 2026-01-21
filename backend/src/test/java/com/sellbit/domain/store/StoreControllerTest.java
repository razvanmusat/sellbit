package com.sellbit.domain.store;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration; // <--- Import nou
import org.springframework.context.annotation.Import; // <--- Import nou
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity; // <--- Import nou
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StoreController.class)
@Import(StoreControllerTest.TestSecurityConfig.class) // <--- 1. Importăm configurația locală
class StoreControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private StoreService storeService;

    @MockitoBean private JwtUtils jwtUtils;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private PasswordEncoder passwordEncoder;

    // --- 2. CLASA DE CONFIGURARE CARE ACTIVEAZĂ @PreAuthorize ---
    @TestConfiguration
    @EnableMethodSecurity(prePostEnabled = true) // <--- Asta face magia
    static class TestSecurityConfig {
    }
    // -------------------------------------------------------------

    private final StoreDTOs.SaveRequest validRequest = new StoreDTOs.SaveRequest(
            "SellBit SRL", "Str. Test 1", "0700123456", "contact@test.ro",
            "RO123456", "J40/1/2024", "RO00BTRL0000"
    );

    @Test
    @DisplayName("POST /api/store - SUCCES: Adminul (Auth 100) POATE salva datele")
    @WithMockUser(authorities = "100")
    void saveStore_Success_Admin() throws Exception {
        var response = new StoreDTOs.Response(1, "SellBit SRL", "Str. Test 1", "0700123456", "contact@test.ro", "RO123456", "J40/1/2024", "RO00BTRL0000", null, null);

        when(storeService.saveOrUpdateStore(any())).thenReturn(response);

        mockMvc.perform(post("/api/store")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("SellBit SRL"));
    }

    @Test
    @DisplayName("POST /api/store - FORBIDDEN: Un Casier (Auth 50) NU are voie să modifice firma")
    @WithMockUser(authorities = "50")
    void saveStore_Forbidden_Casier() throws Exception {
        // Acum testul va trece, pentru că @EnableMethodSecurity va vedea că 50 < 100
        mockMvc.perform(post("/api/store")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/store - SUCCES: Un Casier (Auth 50) POATE vedea datele firmei")
    @WithMockUser(authorities = "50")
    void getStore_Success_Casier() throws Exception {
        var response = new StoreDTOs.Response(1, "SellBit", "Adr", "0700", "e@e.ro", "RO", "J", "IBAN", LocalDateTime.now(), LocalDateTime.now());
        when(storeService.getStore()).thenReturn(response);

        mockMvc.perform(get("/api/store"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("SellBit"));
    }

    @Test
    @DisplayName("POST /api/store - UNAUTHORIZED: User nelogat")
    void saveStore_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/store")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/store - BAD REQUEST: Validare date incorecte")
    @WithMockUser(authorities = "100")
    void saveStore_ValidationFail() throws Exception {
        var invalidRequest = new StoreDTOs.SaveRequest("", "", "", "bad-email", "", "", "");

        mockMvc.perform(post("/api/store")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/store/is-configured - SUCCES: Verificare authenticated")
    @WithMockUser(authorities = "50")
    void isConfigured_Success() throws Exception {
        when(storeService.isConfigured()).thenReturn(true);

        mockMvc.perform(get("/api/store/is-configured"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}
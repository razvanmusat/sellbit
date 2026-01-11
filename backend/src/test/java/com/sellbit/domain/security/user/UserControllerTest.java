package com.sellbit.domain.security.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.config.GlobalExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    void setUp() {
        // Standalone setup folosind pachetul tău exact pentru GlobalExceptionHandler
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // --- TESTE LISTARE ---

    @Test
    @DisplayName("GET /active - Verificare listare utilizatori activi")
    void shouldReturnActiveUsers() throws Exception {
        when(userService.getAllActive()).thenReturn(List.of());

        mockMvc.perform(get("/api/security/users/active"))
                .andExpect(status().isOk());
    }

    // --- TESTE CREATE ---

    @Test
    @DisplayName("POST / - Verificare creare reușită")
    void shouldCreateUser() throws Exception {
        // Folosim CreateUserDTO conform structurii tale record
        CreateUserDTO dto = new CreateUserDTO("user.test", "Pass123!", "Nume Test", 1, "ro");

        mockMvc.perform(post("/api/security/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated());
    }

    // --- TESTE UPDATE ---

    @Test
    @DisplayName("PUT /{id} - Verificare update reușit")
    void shouldUpdateUser() throws Exception {
        // Folosim UpdateUserDTO conform structurii tale record
        UpdateUserDTO dto = new UpdateUserDTO("admin.ok", "Admin Nou", 1, "en");

        mockMvc.perform(put("/api/security/users/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    // --- TESTE TOGGLE STATUS ---

    @Test
    @DisplayName("PATCH /{id}/toggle-status - Schimbare status")
    void shouldToggleStatusSuccessfully() throws Exception {
        mockMvc.perform(patch("/api/security/users/1/toggle-status"))
                .andExpect(status().isOk());
    }

    // --- TESTE CHANGE PASSWORD ---

    @Test
    @DisplayName("PATCH /{id}/change-password - Test succes")
    void shouldChangePasswordSuccessfully() throws Exception {
        // Folosim ChangePasswordDTO conform structurii tale record
        ChangePasswordDTO dto = new ChangePasswordDTO("NewStrongPass123!");

        mockMvc.perform(patch("/api/security/users/1/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("PATCH /{id}/change-password - Test eroare business (400) via GlobalExceptionHandler")
    void shouldReturn400WhenServiceThrowsException() throws Exception {
        ChangePasswordDTO dto = new ChangePasswordDTO("123");
        
        // Simulăm eroarea de RuntimeException pe care GlobalExceptionHandler o prinde
        doThrow(new RuntimeException("ERROR.USER.INVALID_PASSWORD_STRENGTH"))
            .when(userService).changePassword(eq(1), any());

        mockMvc.perform(patch("/api/security/users/1/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("ERROR.USER.INVALID_PASSWORD_STRENGTH"));
    }
}
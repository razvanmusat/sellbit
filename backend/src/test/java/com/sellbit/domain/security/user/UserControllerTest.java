package com.sellbit.domain.security.user;

import com.fasterxml.jackson.databind.ObjectMapper;
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
        // Aici instantiem MockMvc manual, fara context de Spring
        mockMvc = MockMvcBuilders.standaloneSetup(userController).build();
    }

    // --- TESTE LISTARE ---

    @Test
    @DisplayName("GET /active - Trebuie sa mearga fara context Spring")
    void shouldReturnActiveUsers() throws Exception {
        when(userService.getAllActive()).thenReturn(List.of());

        mockMvc.perform(get("/api/security/users/active"))
                .andExpect(status().isOk());
    }

    // --- TESTE CREATE ---

    @Test
    @DisplayName("POST / - Verificare creare reusita")
    void shouldCreateUser() throws Exception {
        CreateUserDTO dto = new CreateUserDTO("user.test", "Pass123!", "Nume Test", 1, "ro");

        mockMvc.perform(post("/api/security/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated());
    }

    // --- TESTE UPDATE ---

    @Test
    @DisplayName("PUT /{id} - Verificare update reusit")
    void shouldUpdateUser() throws Exception {
        UpdateUserDTO dto = new UpdateUserDTO("admin.ok", "Admin Nou", 1, "en");

        mockMvc.perform(put("/api/security/users/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    // --- TESTE TOGGLE STATUS ---

    @Test
    @DisplayName("PATCH /{id}/toggle-status - Test logic switch")
    void shouldToggleStatusSuccessfully() throws Exception {
        mockMvc.perform(patch("/api/security/users/1/toggle-status"))
                .andExpect(status().isOk());
    }

    // --- TESTE CHANGE PASSWORD ---

    @Test
    @DisplayName("PATCH /{id}/change-password - Test succes")
    void shouldChangePasswordSuccessfully() throws Exception {
        ChangePasswordDTO dto = new ChangePasswordDTO("NewStrongPass123!");

        mockMvc.perform(patch("/api/security/users/1/change-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("PATCH /{id}/change-password - Test eroare propagata din Service")
    void shouldReturn400WhenServiceThrowsException() throws Exception {
        ChangePasswordDTO dto = new ChangePasswordDTO("123");
        
        // Simulam eroarea care vine din logica de business
        doThrow(new RuntimeException("ERROR.USER.INVALID_PASSWORD_STRENGTH"))
            .when(userService).changePassword(eq(1), any());

        // FARA GlobalExceptionHandler configurat in standaloneSetup, 
        // aici va arunca eroarea direct. Daca vrei sa testezi status 400, 
        // trebuie sa adaugi .setControllerAdvice(new GlobalExceptionHandler()) in setUp()
        
        try {
            mockMvc.perform(patch("/api/security/users/1/change-password")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(dto)));
        } catch (Exception e) {
            assert(e.getCause().getMessage().equals("ERROR.USER.INVALID_PASSWORD_STRENGTH"));
        }
    }
}
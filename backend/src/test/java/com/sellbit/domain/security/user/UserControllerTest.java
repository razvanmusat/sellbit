package com.sellbit.domain.security.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.config.GlobalExceptionHandler;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
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
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        // Curățăm contextul de securitate după fiecare test pentru a nu afecta altele
        SecurityContextHolder.clearContext();
    }

    // --- TESTE LISTARE (ADMIN) ---

    @Test
    @DisplayName("GET /active - Verificare listare utilizatori activi")
    void shouldReturnActiveUsers() throws Exception {
        when(userService.getAllActive()).thenReturn(List.of());

        mockMvc.perform(get("/api/security/users/active"))
                .andExpect(status().isOk());
    }

    // --- TESTE CREATE (ADMIN) ---

    @Test
    @DisplayName("POST / - Creare user și returnare parolă temporară")
    void shouldCreateUser() throws Exception {
        // 1. Pregătire Request (Fără parolă)
        UserDTOs.Create req = new UserDTOs.Create("user.test", "Nume Test", 1, "ro");

        // 2. Pregătire Răspuns Mockat (Cu parolă temporară)
        UserDTOs.Response resp = new UserDTOs.Response(
                1, "user.test", "Nume Test", 1, "Admin", "100", 100, "ro", 
                true, LocalDateTime.now(), null, "tempPass1234"
        );

        when(userService.create(any(UserDTOs.Create.class))).thenReturn(resp);

        // 3. Execuție și Verificare
        mockMvc.perform(post("/api/security/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tempPassword").value("tempPass1234"));
    }

    // --- TESTE UPDATE (ADMIN) ---

    @Test
    @DisplayName("PUT /{id} - Verificare update reușit")
    void shouldUpdateUser() throws Exception {
        UserDTOs.Update req = new UserDTOs.Update("admin.ok", "Admin Nou", 1, "en");
        
        // Mockăm un răspuns valid (doar ID contează pt testul de status)
        UserDTOs.Response resp = new UserDTOs.Response(1, "admin.ok", "Admin Nou", 1, "Admin", "100", 100, "en", true, null, null, null);
        
        when(userService.update(eq(1), any(UserDTOs.Update.class))).thenReturn(resp);

        mockMvc.perform(put("/api/security/users/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    // --- TESTE STATUS (ADMIN) ---

    @Test
    @DisplayName("PATCH /{id}/toggle-status - Schimbare status")
    void shouldToggleStatusSuccessfully() throws Exception {
        mockMvc.perform(patch("/api/security/users/1/toggle-status"))
                .andExpect(status().isOk());
    }

    // --- TESTE RESET PASSWORD (ADMIN) ---

    @Test
    @DisplayName("PATCH /{id}/reset-password - Admin resetează și primește parola nouă")
    void shouldResetPasswordAndReturnNewOne() throws Exception {
        // Mockăm răspunsul care conține noua parolă generată
        UserDTOs.Response resp = new UserDTOs.Response(
                1, "user", "name", 1, "role", "code", 10, "ro", 
                true, null, null, "newGeneratedPass"
        );

        when(userService.resetPassword(1)).thenReturn(resp);

        mockMvc.perform(patch("/api/security/users/1/reset-password"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tempPassword").value("newGeneratedPass"));
    }

    // --- TESTE CHANGE OWN PASSWORD (USER) ---

    @Test
    @DisplayName("PATCH /me/password - User își schimbă parola singur")
    void shouldChangeOwnPasswordSuccessfully() throws Exception {
        // 1. Mockăm Security Context pentru a simula un user logat
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("curent.user");
        SecurityContextHolder.setContext(securityContext);

        // 2. Request body
        UserDTOs.ChangeOwnPassword req = new UserDTOs.ChangeOwnPassword("oldPass", "NewStrongPass1!");

        // 3. Execuție
        mockMvc.perform(patch("/api/security/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNoContent()); // 204

        // 4. Verificăm că s-a apelat service-ul cu username-ul din context
        verify(userService).changeOwnPassword(eq("curent.user"), any(UserDTOs.ChangeOwnPassword.class));
    }

    @Test
    @DisplayName("PATCH /me/password - Eroare validare service (ex: parola veche greșită)")
    void shouldReturn400WhenServiceThrowsException() throws Exception {
        // 1. Mock Security
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("curent.user");
        SecurityContextHolder.setContext(securityContext);

        // 2. Request
        UserDTOs.ChangeOwnPassword req = new UserDTOs.ChangeOwnPassword("wrongOld", "NewPass");

        // 3. Simulăm eroarea
        doThrow(new RuntimeException("ERROR.AUTH.WRONG_OLD_PASSWORD"))
            .when(userService).changeOwnPassword(anyString(), any());

        // 4. Execuție
        mockMvc.perform(patch("/api/security/users/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest()) // GlobalExceptionHandler prinde RuntimeException
                .andExpect(jsonPath("$.message").value("ERROR.AUTH.WRONG_OLD_PASSWORD"));
    }
}
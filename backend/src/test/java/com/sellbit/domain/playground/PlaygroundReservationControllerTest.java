package com.sellbit.domain.playground;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sellbit.domain.security.auth.JwtUtils; // Import necesar
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService; // Import necesar
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = PlaygroundReservationController.class, excludeAutoConfiguration = {
    org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
    org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class PlaygroundReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PlaygroundReservationService reservationService;

    // Mock-uri pentru securitate pentru a permite contextului să pornească
    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;   

    private final LocalDateTime start = LocalDateTime.of(2026, 1, 10, 14, 0);
    private final LocalDateTime end = LocalDateTime.of(2026, 1, 10, 17, 0);

    // --- 1. POST / (create) ---

    @Test
    @DisplayName("POST /: Succes la crearea rezervării")
    void create_Success() throws Exception {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Popescu", "0722111222", new BigDecimal("100"), true, "Disney", "Nota");
        var res = new PlaygroundReservationDTOs.ReservationResponse(1, start, end, "Popescu", "0722111222", new BigDecimal("100"), LocalDateTime.now(), true, "Disney", "Nota", LocalDateTime.now());

        when(reservationService.createReservation(any())).thenReturn(res);

        mockMvc.perform(post("/api/playground/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.parentName").value("Popescu"));
    }

    @Test
    @DisplayName("POST /: Eroare 400 când parentPhone lipsește (Validare @NotBlank)")
    void create_BadRequest_MissingPhone() throws Exception {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Popescu", "", null, null, null, null);

        mockMvc.perform(post("/api/playground/reservations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- 2. PUT /{id} (update) ---

    @Test
    @DisplayName("PUT /{id}: Succes la actualizarea rezervării")
    void update_Success() throws Exception {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Update", "0722111222", null, false, null, null);
        var res = new PlaygroundReservationDTOs.ReservationResponse(1, start, end, "Update", "0722111222", null, null, false, null, null, LocalDateTime.now());

        when(reservationService.updateReservation(eq(1), any())).thenReturn(res);

        mockMvc.perform(put("/api/playground/reservations/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parentName").value("Update"));
    }

    @Test
    @DisplayName("PUT /{id}: Eroare 400 dacă service-ul aruncă excepție")
    void update_LogicError_ReturnsBadRequest() throws Exception {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Popescu", "123", null, null, null, null);
        
        when(reservationService.updateReservation(eq(1), any()))
                .thenThrow(new RuntimeException("ERROR.RESERVATION.PHONE_INVALID_FORMAT"));

        mockMvc.perform(put("/api/playground/reservations/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- 3. DELETE /{id} ---

    @Test
    @DisplayName("DELETE /{id}: Succes returnează 204 No Content")
    void delete_Success() throws Exception {
        mockMvc.perform(delete("/api/playground/reservations/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /{id}: Eroare 400 dacă rezervarea nu există")
    void delete_NotFound_ReturnsBadRequest() throws Exception {
        doThrow(new RuntimeException("ERROR.RESERVATION.NOT_FOUND")).when(reservationService).deleteReservation(99);

        mockMvc.perform(delete("/api/playground/reservations/99"))
                .andExpect(status().isBadRequest());
    }

    // --- 4. GET / (getByDay) ---

    @Test
    @DisplayName("GET /: Succes returnare listă pentru o zi")
    void getByDay_Success() throws Exception {
        when(reservationService.getReservationsForDay(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/playground/reservations")
                        .param("date", "2026-01-10"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("GET /: Eroare 400 pentru format dată invalid")
    void getByDay_InvalidDate_ReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/playground/reservations")
                        .param("date", "10/01/2026"))
                .andExpect(status().isBadRequest());
    }

        // --- 5. PATCH /{id}/confirm-digital-invitation ---

        @Test
        @DisplayName("PATCH /{id}/confirm-digital-invitation: Succes")
        void confirmDigitalInvitation_Success() throws Exception {
        var res = new PlaygroundReservationDTOs.ReservationResponse(
            1,
            start,
            end,
            "Popescu",
            "0722111222",
            null,
            null,
            true,
            null,
            null,
            LocalDateTime.now());

        when(reservationService.confirmDigitalInvitation(1)).thenReturn(res);

        mockMvc.perform(patch("/api/playground/reservations/1/confirm-digital-invitation"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.digitalInvitation").value(true));
        }

        @Test
        @DisplayName("PATCH /{id}/confirm-digital-invitation: Eroare 400 dacă rezervarea nu există")
        void confirmDigitalInvitation_NotFound_ReturnsBadRequest() throws Exception {
        when(reservationService.confirmDigitalInvitation(99))
            .thenThrow(new RuntimeException("ERROR.RESERVATION.NOT_FOUND"));

        mockMvc.perform(patch("/api/playground/reservations/99/confirm-digital-invitation"))
            .andExpect(status().isBadRequest());
        }
}
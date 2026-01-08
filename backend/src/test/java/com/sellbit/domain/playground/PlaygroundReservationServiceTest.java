package com.sellbit.domain.playground;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlaygroundReservationServiceTest {

    @Mock
    private PlaygroundReservationRepository reservationRepository;

    @InjectMocks
    private PlaygroundReservationService reservationService;

    private final LocalDateTime start = LocalDateTime.of(2026, 1, 10, 14, 0);
    private final LocalDateTime end = LocalDateTime.of(2026, 1, 10, 17, 0);

    // --- 1. TESTE createReservation ---

    @Test
    @DisplayName("createReservation: Succes - Număr de România valid (07xxxxxxxx)")
    void create_Success_RomaniaPhone() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Popescu", "0722111222", new BigDecimal("100"), true, "Tema", "Nota");
        
        when(reservationRepository.findOverlappingReservations(start, end)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> {
            PlaygroundReservation r = i.getArgument(0);
            r.setId(1);
            return r;
        });

        var result = reservationService.createReservation(req);

        assertNotNull(result.id());
        assertEquals("0722111222", result.parentPhone());
    }

    @Test
    @DisplayName("createReservation: Succes - Număr Internațional valid (+...)")
    void create_Success_InternationalPhone() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "John", "+44123456", null, false, null, null);
        when(reservationRepository.findOverlappingReservations(start, end)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.createReservation(req);
        assertEquals("+44123456", result.parentPhone());
    }

    @Test
    @DisplayName("createReservation: Eroare - Telefon România format invalid")
    void create_Fail_InvalidRomaniaPhone() {
        // 9 cifre în loc de 10
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "P", "072211122", null, false, null, null);
        
        var ex = assertThrows(RuntimeException.class, () -> reservationService.createReservation(req));
        assertEquals("ERROR.RESERVATION.PHONE_INVALID_FORMAT", ex.getMessage());
    }

    @Test
    @DisplayName("createReservation: Eroare - Interval orar ocupat")
    void create_Fail_Overlap() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "P", "0722111222", null, false, null, null);
        when(reservationRepository.findOverlappingReservations(start, end)).thenReturn(List.of(new PlaygroundReservation()));

        var ex = assertThrows(RuntimeException.class, () -> reservationService.createReservation(req));
        assertEquals("ERROR.RESERVATION.TIME_SLOT_OCCUPIED", ex.getMessage());
    }

    // --- 2. TESTE getReservationsForDay ---

    @Test
    @DisplayName("getReservationsForDay: Returnează lista")
    void getDay_Success() {
        when(reservationRepository.findByStartAtBetweenOrderByStartAtAsc(any(), any())).thenReturn(List.of(new PlaygroundReservation()));
        var result = reservationService.getReservationsForDay(start, end);
        assertEquals(1, result.size());
    }

    @Test
    @DisplayName("getReservationsForDay: Listă goală")
    void getDay_Empty() {
        when(reservationRepository.findByStartAtBetweenOrderByStartAtAsc(any(), any())).thenReturn(List.of());
        var result = reservationService.getReservationsForDay(start, end);
        assertTrue(result.isEmpty());
    }

    // --- 3. TESTE updateReservation ---

    @Test
    @DisplayName("updateReservation: Succes și setare automată dată avans")
    void update_Success_AdvancePaidAt() {
        var existing = PlaygroundReservation.builder().id(1).advanceAmount(BigDecimal.ZERO).parentPhone("0722111222").build();
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Update", "0722111222", new BigDecimal("50"), false, null, null);

        when(reservationRepository.findById(1)).thenReturn(Optional.of(existing));
        when(reservationRepository.findOverlappingReservationsExcludingSelf(start, end, 1)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.updateReservation(1, req);

        assertNotNull(result.advancePaidAt());
        assertEquals(new BigDecimal("50"), result.advanceAmount());
    }

    @Test
    @DisplayName("updateReservation: Eroare la telefon invalid în timpul update-ului")
    void update_Fail_Phone() {
        var existing = PlaygroundReservation.builder().id(1).build();
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "U", "invalid-phone", null, false, null, null);
        
        when(reservationRepository.findById(1)).thenReturn(Optional.of(existing));

        var ex = assertThrows(RuntimeException.class, () -> reservationService.updateReservation(1, req));
        assertEquals("ERROR.RESERVATION.PHONE_INVALID_FORMAT", ex.getMessage());
    }

    // --- 4. TESTE deleteReservation ---

    @Test
    @DisplayName("deleteReservation: Succes")
    void delete_Success() {
        when(reservationRepository.existsById(1)).thenReturn(true);
        assertDoesNotThrow(() -> reservationService.deleteReservation(1));
        verify(reservationRepository).deleteById(1);
    }

    @Test
    @DisplayName("deleteReservation: Eroare ID negăsit")
    void delete_NotFound() {
        when(reservationRepository.existsById(99)).thenReturn(false);
        var ex = assertThrows(RuntimeException.class, () -> reservationService.deleteReservation(99));
        assertEquals("ERROR.RESERVATION.NOT_FOUND", ex.getMessage());
    }

    // --- TESTE SPECIFICE VALIDARE (Utils integrat) ---

    @Test
    @DisplayName("Utils Validation: Telefon internațional prea scurt (eroare)")
    void phone_International_TooShort() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "P", "+123", null, false, null, null);
        var ex = assertThrows(RuntimeException.class, () -> reservationService.createReservation(req));
        assertEquals("ERROR.RESERVATION.PHONE_INVALID_FORMAT", ex.getMessage());
    }

    @Test
    @DisplayName("Utils Validation: Telefon null sau gol (eroare)")
    void phone_NullOrBlank() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "P", "  ", null, false, null, null);
        var ex = assertThrows(RuntimeException.class, () -> reservationService.createReservation(req));
        assertEquals("ERROR.RESERVATION.PHONE_INVALID_FORMAT", ex.getMessage());
    }
}
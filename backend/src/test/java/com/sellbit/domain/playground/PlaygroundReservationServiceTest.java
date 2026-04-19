package com.sellbit.domain.playground;

import com.sellbit.domain.catering.cateringorder.CateringOrderService;

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

    @Mock
    private CateringOrderService cateringOrderService;

    @InjectMocks
    private PlaygroundReservationService reservationService;

    // Data în viitor pentru a trece de validările "not in past"
    private final LocalDateTime start = LocalDateTime.now().plusDays(10).withHour(14).withMinute(0).withSecond(0).withNano(0);
    private final LocalDateTime end = start.plusHours(3);

    // --- 1. TESTE createReservation ---

    @Test
    @DisplayName("createReservation: Succes - Număr de România valid")
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
    @DisplayName("createReservation: Eroare - Telefon România format invalid")
    void create_Fail_InvalidRomaniaPhone() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "P", "072211122", null, false, null, null);
        
        var ex = assertThrows(RuntimeException.class, () -> reservationService.createReservation(req));
        assertEquals("ERROR.RESERVATION.PHONE_INVALID_FORMAT", ex.getMessage());
    }

    // --- 2. TESTE updateReservation ---

    @Test
    @DisplayName("updateReservation: Succes și setare automată dată avans")
    void update_Success_AdvancePaidAt() {
        var existing = PlaygroundReservation.builder()
                .id(1)
                .startAt(start) // Trebuie să fie în viitor
                .advanceAmount(BigDecimal.ZERO)
                .parentPhone("0722111222")
                .build();
        
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Update", "0722111222", new BigDecimal("50"), false, null, null);

        when(reservationRepository.findById(1)).thenReturn(Optional.of(existing));
        when(reservationRepository.findOverlappingReservationsExcludingSelf(start, end, 1)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.updateReservation(1, req);

        assertNotNull(result.advancePaidAt());
        assertEquals(new BigDecimal("50"), result.advanceAmount());
    }

    // --- 3. TESTE deleteReservation (CORECȚIE INTEGRALĂ) ---

    @Test
    @DisplayName("deleteReservation: Succes")
    void delete_Success() {
        Integer id = 1;
        PlaygroundReservation reservation = PlaygroundReservation.builder()
                .id(id)
                .startAt(LocalDateTime.now().plusDays(1)) // Validare: să nu fie în trecut
                .build();

        // Service-ul tău folosește findById, NU existsById
        when(reservationRepository.findById(id)).thenReturn(Optional.of(reservation));

        assertDoesNotThrow(() -> reservationService.deleteReservation(id));
        
        // Service-ul tău folosește delete(reservation), NU deleteById(id)
        verify(reservationRepository).delete(reservation);
    }

    @Test
    @DisplayName("deleteReservation: Eroare ID negăsit")
    void delete_NotFound() {
        Integer id = 99;
        when(reservationRepository.findById(id)).thenReturn(Optional.empty());

        var ex = assertThrows(RuntimeException.class, () -> reservationService.deleteReservation(id));
        assertEquals("ERROR.RESERVATION.NOT_FOUND", ex.getMessage());
    }

    @Test
    @DisplayName("deleteReservation: Eroare ștergere rezervare din trecut")
    void delete_Fail_PastDate() {
        Integer id = 1;
        PlaygroundReservation pastReservation = PlaygroundReservation.builder()
                .id(id)
                .startAt(LocalDateTime.now().minusDays(1)) // Rezervare de ieri
                .build();

        when(reservationRepository.findById(id)).thenReturn(Optional.of(pastReservation));

        var ex = assertThrows(RuntimeException.class, () -> reservationService.deleteReservation(id));
        assertEquals("ERROR.RESERVATION.CANNOT_DELETE_PAST", ex.getMessage());
    }

    // --- 4. TESTE ALTE VALIDĂRI ---

    @Test
    @DisplayName("createReservation: Eroare - Data în trecut")
    void create_Fail_PastDate() {
        LocalDateTime pastStart = LocalDateTime.now().minusDays(1);
        LocalDateTime pastEnd = pastStart.plusHours(2);
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(pastStart, pastEnd, "P", "0722111222", null, false, null, null);

        var ex = assertThrows(RuntimeException.class, () -> reservationService.createReservation(req));
        assertEquals("ERROR.RESERVATION.DATE_IN_PAST", ex.getMessage());
    }

    @Test
    @DisplayName("createReservation: Succes - digitalInvitation rămâne null (stare PENDING)")
    void create_Success_DigitalInvitationNull() {
        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Popescu", "0722111222", null, null, null, null);

        when(reservationRepository.findOverlappingReservations(start, end)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> {
            PlaygroundReservation r = i.getArgument(0);
            r.setId(10);
            return r;
        });

        var result = reservationService.createReservation(req);

        assertEquals(10, result.id());
        assertNull(result.digitalInvitation());
    }

    @Test
    @DisplayName("updateReservation: Succes - digitalInvitation devine false")
    void update_Success_DigitalInvitationFalse() {
        var existing = PlaygroundReservation.builder()
                .id(2)
                .startAt(start)
                .endAt(end)
                .parentPhone("0722111222")
                .digitalInvitation(null)
                .build();

        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Update", "0722111222", null, false, null, null);

        when(reservationRepository.findById(2)).thenReturn(Optional.of(existing));
        when(reservationRepository.findOverlappingReservationsExcludingSelf(start, end, 2)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.updateReservation(2, req);

        assertEquals(Boolean.FALSE, result.digitalInvitation());
    }

    @Test
    @DisplayName("updateReservation: Succes - digitalInvitation devine null")
    void update_Success_DigitalInvitationNull() {
        var existing = PlaygroundReservation.builder()
                .id(3)
                .startAt(start)
                .endAt(end)
                .parentPhone("0722111222")
                .digitalInvitation(Boolean.TRUE)
                .build();

        var req = new PlaygroundReservationDTOs.CreateReservationRequest(start, end, "Update", "0722111222", null, null, null, null);

        when(reservationRepository.findById(3)).thenReturn(Optional.of(existing));
        when(reservationRepository.findOverlappingReservationsExcludingSelf(start, end, 3)).thenReturn(List.of());
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.updateReservation(3, req);

        assertNull(result.digitalInvitation());
    }

    @Test
    @DisplayName("confirmDigitalInvitation: Succes - setează true")
    void confirmDigitalInvitation_Success() {
        var reservation = PlaygroundReservation.builder()
                .id(5)
                .startAt(start)
                .endAt(end)
                .parentName("Popescu")
                .parentPhone("0722111222")
                .digitalInvitation(null)
                .build();

        when(reservationRepository.findById(5)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.confirmDigitalInvitation(5);

        assertEquals(Boolean.TRUE, result.digitalInvitation());
    }

    @Test
    @DisplayName("confirmDigitalInvitation: Eroare - rezervare inexistentă")
    void confirmDigitalInvitation_NotFound() {
        when(reservationRepository.findById(404)).thenReturn(Optional.empty());

        var ex = assertThrows(RuntimeException.class, () -> reservationService.confirmDigitalInvitation(404));
        assertEquals("ERROR.RESERVATION.NOT_FOUND", ex.getMessage());
    }

    @Test
    @DisplayName("confirmTheme: Succes - setează themeConfirmed true")
    void confirmTheme_Success() {
        var reservation = PlaygroundReservation.builder()
                .id(6)
                .startAt(start)
                .endAt(end)
                .parentName("Popescu")
                .parentPhone("0722111222")
                .theme("Frozen")
                .build();

        when(reservationRepository.findById(6)).thenReturn(Optional.of(reservation));
        when(reservationRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = reservationService.confirmTheme(6);

        assertEquals(Boolean.TRUE, result.themeConfirmed());
    }

    @Test
    @DisplayName("confirmTheme: Eroare - rezervare inexistentă")
    void confirmTheme_NotFound() {
        when(reservationRepository.findById(404)).thenReturn(Optional.empty());

        var ex = assertThrows(RuntimeException.class, () -> reservationService.confirmTheme(404));
        assertEquals("ERROR.RESERVATION.NOT_FOUND", ex.getMessage());
    }
}
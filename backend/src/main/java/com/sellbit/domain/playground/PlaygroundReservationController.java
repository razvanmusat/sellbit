package com.sellbit.domain.playground;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PostAuthorize;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/playground/reservations")
@RequiredArgsConstructor
public class PlaygroundReservationController {

    private final PlaygroundReservationService reservationService;

    @PostAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping // Creare rezervare nouă
    public ResponseEntity<PlaygroundReservationDTOs.ReservationResponse> create(
            @RequestBody @Valid PlaygroundReservationDTOs.CreateReservationRequest req) {
        return ResponseEntity.ok(reservationService.createReservation(req));
    }

    @PostAuthorize("hasAnyAuthority('50', '100')")
    @PutMapping("/{id}") // UPDATE: Modificare oră, adăugare avans, schimbare notă.
    public ResponseEntity<PlaygroundReservationDTOs.ReservationResponse> update(
            @PathVariable Integer id,
            @RequestBody @Valid PlaygroundReservationDTOs.CreateReservationRequest req) {
        return ResponseEntity.ok(reservationService.updateReservation(id, req));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @DeleteMapping("/{id}") // Anulare rezervare (Clientul nu mai vine, etc...).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('100')")
    @PatchMapping("/{id}/confirm-digital-invitation")
    public ResponseEntity<PlaygroundReservationDTOs.ReservationResponse> confirmDigitalInvitation(@PathVariable Integer id) {
        return ResponseEntity.ok(reservationService.confirmDigitalInvitation(id));
    }

    @PreAuthorize("hasAuthority('100')")
    @PatchMapping("/{id}/confirm-theme")
    public ResponseEntity<PlaygroundReservationDTOs.ReservationResponse> confirmTheme(@PathVariable Integer id) {
        return ResponseEntity.ok(reservationService.confirmTheme(id));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping // VIEW: Calendarul zilnic.
    public ResponseEntity<List<PlaygroundReservationDTOs.ReservationResponse>> getByDay(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);

        return ResponseEntity.ok(reservationService.getReservationsForDay(startOfDay, endOfDay));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/interval") // VIEW: Calendarul pentru un interval dat
    public ResponseEntity<List<PlaygroundReservationDTOs.ReservationResponse>> getByInterval(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(reservationService.getReservationsForInterval(start, end));
    }
}
package com.sellbit.domain.playground;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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

    @PostMapping
    public ResponseEntity<PlaygroundReservationDTOs.ReservationResponse> create(
            @RequestBody @Valid PlaygroundReservationDTOs.CreateReservationRequest req) {
        return ResponseEntity.ok(reservationService.createReservation(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlaygroundReservationDTOs.ReservationResponse> update(
            @PathVariable Integer id, 
            @RequestBody @Valid PlaygroundReservationDTOs.CreateReservationRequest req) {
        return ResponseEntity.ok(reservationService.updateReservation(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<PlaygroundReservationDTOs.ReservationResponse>> getByDay(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);
        
        return ResponseEntity.ok(reservationService.getReservationsForDay(startOfDay, endOfDay));
    }
}
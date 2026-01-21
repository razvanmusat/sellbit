package com.sellbit.domain.playground;

import com.sellbit.domain.utils.Utils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaygroundReservationService {

    private final PlaygroundReservationRepository reservationRepository;

    @Transactional
    public PlaygroundReservationDTOs.ReservationResponse createReservation(
            PlaygroundReservationDTOs.CreateReservationRequest req) {

        // 1. Validare Timp (Folosim metoda helper 1)
        validateReservationTimes(req.startAt(), req.endAt());

        // 2. Validare Telefon
        if (!Utils.isValidPhoneNumber(req.parentPhone())) {
            throw new RuntimeException("ERROR.RESERVATION.PHONE_INVALID_FORMAT");
        }

        // 3. Validare Suprapunere (Folosim metoda helper 2 - null pt excludeId)
        checkOverlap(req.startAt(), req.endAt(), null);

        // 4. Construire entitate
        PlaygroundReservation reservation = PlaygroundReservation.builder()
                .startAt(req.startAt())
                .endAt(req.endAt())
                .parentName(req.parentName())
                .parentPhone(req.parentPhone())
                .advanceAmount(req.advanceAmount())
                .digitalInvitation(req.digitalInvitation() != null && req.digitalInvitation())
                .theme(req.theme())
                .note(req.note())
                .build();

        // 5. Data plată avans (Folosim metoda helper 3)
        if (hasPositiveAdvance(reservation.getAdvanceAmount())) {
            reservation.setAdvancePaidAt(LocalDateTime.now());
        }

        return mapToResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public PlaygroundReservationDTOs.ReservationResponse updateReservation(Integer id,
            PlaygroundReservationDTOs.CreateReservationRequest req) {

        PlaygroundReservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.RESERVATION.NOT_FOUND"));

        // 1. Validare Timp (Helper 1)
        validateReservationTimes(req.startAt(), req.endAt());

        // 2. Validare Telefon
        if (!Utils.isValidPhoneNumber(req.parentPhone())) {
            throw new RuntimeException("ERROR.RESERVATION.PHONE_INVALID_FORMAT");
        }

        // 3. Validare Overlap (Helper 2 - trimitem ID-ul curent pentru excludere)
        checkOverlap(req.startAt(), req.endAt(), id);

        // 4. Logică Avans (Helper 3)
        boolean hadNoAdvance = !hasPositiveAdvance(reservation.getAdvanceAmount());
        boolean hasNewAdvance = hasPositiveAdvance(req.advanceAmount());

        if (hadNoAdvance && hasNewAdvance) {
            reservation.setAdvancePaidAt(LocalDateTime.now());
        }

        // 5. Actualizare câmpuri
        reservation.setStartAt(req.startAt());
        reservation.setEndAt(req.endAt());
        reservation.setParentName(req.parentName());
        reservation.setParentPhone(req.parentPhone());
        reservation.setAdvanceAmount(req.advanceAmount());
        reservation.setDigitalInvitation(req.digitalInvitation() != null && req.digitalInvitation());
        reservation.setTheme(req.theme());
        reservation.setNote(req.note());

        return mapToResponse(reservationRepository.save(reservation));
    }

    @Transactional
    public void deleteReservation(Integer id) {
        if (!reservationRepository.existsById(id)) {
            throw new RuntimeException("ERROR.RESERVATION.NOT_FOUND");
        }
        reservationRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<PlaygroundReservationDTOs.ReservationResponse> getReservationsForDay(LocalDateTime startOfDay,
            LocalDateTime endOfDay) {
        return reservationRepository.findByStartAtBetweenOrderByStartAtAsc(startOfDay, endOfDay)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 1. Validare logică orară
    private void validateReservationTimes(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new RuntimeException("ERROR.RESERVATION.DATES_REQUIRED");
        }
        if (!start.isBefore(end)) {
            throw new RuntimeException("ERROR.RESERVATION.START_MUST_BE_BEFORE_END");
        }
    }

    // 2. Validare suprapuneri (Unifică logica de Create și Update)
    private void checkOverlap(LocalDateTime start, LocalDateTime end, Integer excludeId) {
        List<PlaygroundReservation> overlaps;

        if (excludeId == null) {
            // Logică pentru CREATE
            overlaps = reservationRepository.findOverlappingReservations(start, end);
        } else {
            // Logică pentru UPDATE (exclude sinele)
            overlaps = reservationRepository.findOverlappingReservationsExcludingSelf(start, end, excludeId);
        }

        if (!overlaps.isEmpty()) {
            throw new RuntimeException("ERROR.RESERVATION.TIME_SLOT_OCCUPIED");
        }
    }

    // 3. Verificare avans pozitiv
    private boolean hasPositiveAdvance(BigDecimal amount) {
        return amount != null && amount.compareTo(BigDecimal.ZERO) > 0;
    }

    private PlaygroundReservationDTOs.ReservationResponse mapToResponse(PlaygroundReservation r) {
        return new PlaygroundReservationDTOs.ReservationResponse(
                r.getId(),
                r.getStartAt(),
                r.getEndAt(),
                r.getParentName(),
                r.getParentPhone(),
                r.getAdvanceAmount(),
                r.getAdvancePaidAt(),
                r.getDigitalInvitation(),
                r.getTheme(),
                r.getNote(),
                r.getCreatedAt());
    }
}
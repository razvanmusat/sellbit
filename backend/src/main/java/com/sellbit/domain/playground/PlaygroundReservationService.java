package com.sellbit.domain.playground;

import com.sellbit.domain.catering.cateringorder.CateringOrderService;
import com.sellbit.domain.utils.Utils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaygroundReservationService {

    private final PlaygroundReservationRepository reservationRepository;
    private final CateringOrderService cateringOrderService;

    @Transactional
    public PlaygroundReservationDTOs.ReservationResponse createReservation(
            PlaygroundReservationDTOs.CreateReservationRequest req) {

        // 1. Validare Timp (Folosim metoda helper 1)
        validateReservationTimes(req.startAt(), req.endAt());

        // 2. Validare Telefon
        validatePhoneNumber(req.parentPhone());

        // 3. Validare Suprapunere (Folosim metoda helper 2 - null pt excludeId)
        checkOverlap(req.startAt(), req.endAt(), null);

        String formattedName = Utils.formatFullName(req.parentName());
        // 4. Construire entitate
        PlaygroundReservation reservation = PlaygroundReservation.builder()
                .startAt(req.startAt())
                .endAt(req.endAt())
                .parentName(formattedName)
                .parentPhone(req.parentPhone())
                .advanceAmount(req.advanceAmount())
                .digitalInvitation(Boolean.TRUE.equals(req.digitalInvitation()))
                .theme(Utils.formatFullName(req.theme()))
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
        validatePhoneNumber(req.parentPhone());

        // 3. Validare Overlap (Helper 2 - trimitem ID-ul curent pentru excludere)
        checkOverlap(req.startAt(), req.endAt(), id);

        // 4. Logică Avans (Helper 3)
        boolean hadNoAdvance = !hasPositiveAdvance(reservation.getAdvanceAmount());
        boolean hasNewAdvance = hasPositiveAdvance(req.advanceAmount());
        boolean dateChanged = !reservation.getStartAt().toLocalDate().isEqual(req.startAt().toLocalDate());

        if (hadNoAdvance && hasNewAdvance) {
            reservation.setAdvancePaidAt(LocalDateTime.now());
        }

        // 5. Actualizare câmpuri
        reservation.setStartAt(req.startAt());
        reservation.setEndAt(req.endAt());
        reservation.setParentName(Utils.formatFullName(req.parentName()));
        reservation.setParentPhone(req.parentPhone());
        reservation.setAdvanceAmount(req.advanceAmount());
        reservation.setDigitalInvitation(Boolean.TRUE.equals(req.digitalInvitation()));
        reservation.setTheme(Utils.formatFullName(req.theme()));
        reservation.setNote(req.note());

        PlaygroundReservation savedReservation = reservationRepository.save(reservation);
        if (dateChanged) {
            cateringOrderService.moveOrdersToDate(id, req.startAt().toLocalDate());
        }

        return mapToResponse(savedReservation);
    }

    @Transactional
    public void deleteReservation(Integer id) {
        
        PlaygroundReservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.RESERVATION.NOT_FOUND"));

        LocalDate reservationDate = reservation.getStartAt().toLocalDate();
        LocalDate today = LocalDate.now();

        if (reservationDate.isBefore(today)) {
            throw new RuntimeException("ERROR.RESERVATION.CANNOT_DELETE_PAST");
        }
        reservationRepository.delete(reservation);
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

        LocalDate reservationDate = start.toLocalDate();
        LocalDate today = LocalDate.now();

        if (reservationDate.isBefore(today)) {
            throw new RuntimeException("ERROR.RESERVATION.DATE_IN_PAST");
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

    private void validatePhoneNumber(String phone) {        

        // Dacă nu e număr internațional (00), verificăm formatul local
        if (!phone.startsWith("00")) {
            if (!Utils.isValidPhoneNumber(phone)) {
                throw new RuntimeException("ERROR.RESERVATION.PHONE_INVALID_FORMAT");
            }
        }
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
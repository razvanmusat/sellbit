package com.sellbit.domain.playground;

import com.sellbit.domain.utils.Utils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaygroundReservationService {

    private final PlaygroundReservationRepository reservationRepository;

    @Transactional
    public PlaygroundReservationDTOs.ReservationResponse createReservation(PlaygroundReservationDTOs.CreateReservationRequest req) {
        
        // 1. Validare număr de telefon (Metoda ta din Utils)
        if (!Utils.isValidPhoneNumber(req.parentPhone())) {
            throw new RuntimeException("ERROR.RESERVATION.PHONE_INVALID_FORMAT");
        }

        // 2. Validare suprapunere interval orar (Overlap)
        List<PlaygroundReservation> overlaps = reservationRepository.findOverlappingReservations(req.startAt(), req.endAt());
        if (!overlaps.isEmpty()) {
            throw new RuntimeException("ERROR.RESERVATION.TIME_SLOT_OCCUPIED");
        }

        // 3. Construire entitate
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

        // 4. Logica pentru data plății avansului
        if (reservation.getAdvanceAmount() != null && reservation.getAdvanceAmount().doubleValue() > 0) {
            reservation.setAdvancePaidAt(LocalDateTime.now());
        }

        return mapToResponse(reservationRepository.save(reservation));
    }

    @Transactional(readOnly = true)
    public List<PlaygroundReservationDTOs.ReservationResponse> getReservationsForDay(LocalDateTime startOfDay, LocalDateTime endOfDay) {
        return reservationRepository.findByStartAtBetweenOrderByStartAtAsc(startOfDay, endOfDay)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public PlaygroundReservationDTOs.ReservationResponse updateReservation(Integer id, PlaygroundReservationDTOs.CreateReservationRequest req) {
        PlaygroundReservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.RESERVATION.NOT_FOUND"));

        // 1. Validare Telefon (dacă s-a schimbat)
        if (!Utils.isValidPhoneNumber(req.parentPhone())) {
            throw new RuntimeException("ERROR.RESERVATION.PHONE_INVALID_FORMAT");
        }

        // 2. Validare Overlap (excluzând rezervarea curentă)
        List<PlaygroundReservation> overlaps = reservationRepository.findOverlappingReservationsExcludingSelf(
                req.startAt(), req.endAt(), id);
        if (!overlaps.isEmpty()) {
            throw new RuntimeException("ERROR.RESERVATION.TIME_SLOT_OCCUPIED");
        }

        // 3. Logica specială pentru AVANS
        // Dacă înainte nu aveam avans și acum primim unul, setăm data plății
        if ((reservation.getAdvanceAmount() == null || reservation.getAdvanceAmount().doubleValue() == 0) 
            && (req.advanceAmount() != null && req.advanceAmount().doubleValue() > 0)) {
            reservation.setAdvancePaidAt(LocalDateTime.now());
        } 
        // Dacă se modifică suma avansului (dar existat deja unul), putem decide dacă actualizăm data sau nu.
        // Aici am setat să pună data doar la prima înregistrare a avansului.

        // 4. Actualizare câmpuri
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
                r.getCreatedAt()
        );
    }
}
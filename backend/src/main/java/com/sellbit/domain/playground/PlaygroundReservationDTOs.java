package com.sellbit.domain.playground;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PlaygroundReservationDTOs {

    public record CreateReservationRequest(
        @NotNull(message = "ERROR.RESERVATION.START_REQUIRED")
        LocalDateTime startAt,

        @NotNull(message = "ERROR.RESERVATION.END_REQUIRED")
        LocalDateTime endAt,

        @NotBlank(message = "ERROR.RESERVATION.PARENT_NAME_REQUIRED")
        String parentName,

        @NotBlank(message = "ERROR.RESERVATION.PHONE_REQUIRED")
        String parentPhone,

        BigDecimal advanceAmount,
        Boolean digitalInvitation,
        String theme,
        String note
    ) {}

    public record ReservationResponse(
        Integer id,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String parentName,
        String parentPhone,
        BigDecimal advanceAmount,
        LocalDateTime advancePaidAt,
        Boolean digitalInvitation,
        String theme,
        Boolean themeConfirmed,
        String note,
        LocalDateTime createdAt
    ) {}
}
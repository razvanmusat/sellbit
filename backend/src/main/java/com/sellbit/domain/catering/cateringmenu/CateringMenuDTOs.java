package com.sellbit.domain.catering.cateringmenu;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CateringMenuDTOs {

    public record CreateMenuRequest(
        @NotBlank(message = "ERROR.CATERING_MENU.NAME_REQUIRED")
        @Size(max = 100, message = "ERROR.CATERING_MENU.NAME_TOO_LONG")
        String name,

        @NotNull(message = "ERROR.CATERING_MENU.PRICE_REQUIRED")
        @PositiveOrZero(message = "ERROR.CATERING_MENU.INVALID_PRICE")
        BigDecimal purchasePrice,

        Boolean isActive
    ) {}

    public record MenuFullResponse(
        Integer id,
        String name,
        BigDecimal purchasePrice,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    public record MenuShortResponse(
        Integer id,
        String name
    ) {}
}
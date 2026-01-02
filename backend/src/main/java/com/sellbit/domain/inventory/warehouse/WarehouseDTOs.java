package com.sellbit.domain.inventory.warehouse;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class WarehouseDTOs {

    public record Create(
        @NotBlank(message = "ERROR.WAREHOUSE.CODE_EMPTY")
        String code,

        @NotBlank(message = "ERROR.WAREHOUSE.NAME_EMPTY")
        String name
    ) {}

    public record Update(
        @NotNull(message = "ERROR.WAREHOUSE.ID_REQUIRED")
        Integer id,

        @NotBlank(message = "ERROR.WAREHOUSE.CODE_EMPTY")
        String code,

        @NotBlank(message = "ERROR.WAREHOUSE.NAME_EMPTY")
        String name
    ) {}

    public record Response(
        Integer id,
        String code,
        String name,
        boolean isActive,
        LocalDateTime createdAt
    ) {}
}
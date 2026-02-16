package com.sellbit.domain.inventory.stockadjustment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public class StockAdjustmentDTOs {

    /**
     * DTO pentru crearea unei ajustări din interfața de Inventar/Service.
     */
    public record Create(
        @NotNull(message = "ERROR.PRODUCT.REQUIRED") 
        Integer productId,

        @NotNull(message = "ERROR.WAREHOUSE.REQUIRED") 
        Integer warehouseId,

        @NotNull(message = "ERROR.USER.REQUIRED") 
        Integer userId,

        @NotNull(message = "ERROR.REASON.REQUIRED") 
        Integer reasonId, // ID-ul din adjustment_reasons (Ex: Spargere, Inventar)

        @NotNull(message = "ERROR.QUANTITY.REQUIRED")
        @DecimalMin(value = "-999999.999", inclusive = true)
        @DecimalMax(value = "999999.999", inclusive = true)
        BigDecimal quantityChange, // Pozitiv (+ găsit) sau Negativ (- pierdut)

        String note
    ) {}

    /**
     * DTO pentru vizualizarea în istoric/rapoarte.
     */
    public record Response(
        Integer id,
        String productName,
        Integer warehouseId,
        String warehouseName,
        String reasonLabel,
        String userName,
        BigDecimal quantityChange,
        String note,
        LocalDateTime adjustedAt
    ) {}
}
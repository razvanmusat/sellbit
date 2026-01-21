package com.sellbit.domain.inventory.stockcurrent;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class StockCurrentDTOs {

    // 1. Folosit pentru listarea în tabelul de inventar (React)
    public record Response(
        Integer warehouseId,
        Integer productId,
        String productName,
        String barcode,
        String unitName,
        BigDecimal quantity,
        LocalDateTime updatedAt
    ) {}

    // 2. Folosit dacă vrem să actualizăm stocul manual (ajustări rapide)
    public record UpdateQuantity(
        Integer warehouseId,
        @NotNull(message = "ERROR.STOCK.REASON_REQUIRED")
        String reason,
        @NotEmpty(message = "ERROR.STOCK.ITEMS_REQUIRED")
        @Valid
        java.util.List<UpdateItem> items
    ) {}
    // 2.1 Folosit pentru fiecare item din lista de actualizări
    public record UpdateItem(
        @NotNull(message = "ERROR.PRODUCT.ID_REQUIRED")
        Integer productId,
        @NotNull(message = "ERROR.STOCK.QUANTITY_REQUIRED")
        @DecimalMin(value = "0.000", inclusive = true, message = "ERROR.STOCK.NEGATIVE_NOT_ALLOWED")
        BigDecimal newQuantity
    ) {}

    // 3. Un DTO simplificat dacă avem nevoie doar de ID-uri și cantitate
    public record Summary(
        Integer productId,
        BigDecimal quantity
    ) {}
}
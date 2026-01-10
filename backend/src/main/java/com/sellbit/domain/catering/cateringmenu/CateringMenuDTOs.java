package com.sellbit.domain.catering.cateringmenu;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CateringMenuDTOs {

    // Folosit la POST pentru a crea o legătură nouă
    public record CreateMenuRequest(
        @NotNull(message = "ERROR.CATERING_MENU.PRODUCT_ID_REQUIRED")
        Integer productId,

        @NotNull(message = "ERROR.CATERING_MENU.PRICE_REQUIRED")
        @PositiveOrZero(message = "ERROR.CATERING_MENU.INVALID_PRICE")
        BigDecimal purchasePrice,

        Boolean isActive
    ) {}

    // Folosit în Admin pentru tabelul cu prețuri deja salvate
    public record MenuFullResponse(
        Integer id,
        Integer productId,
        String productName, // Modificat: Avem nevoie de nume pentru tabel
        BigDecimal purchasePrice,
        Boolean isActive,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}

    // Folosit în dropdown-ul din React pentru a alege un produs
    public record MenuShortResponse(
        Integer productId, // ID-ul produsului din tabela products
        String productName // Numele produsului pentru afișare în dropdown
    ) {}
}
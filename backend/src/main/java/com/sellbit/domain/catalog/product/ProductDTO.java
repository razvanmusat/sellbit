package com.sellbit.domain.catalog.product;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductDTO(
    Integer id,

    @NotBlank(message = "ERROR.PRODUCT.NAME_REQUIRED")
    String name,

    String barcode,

    @NotNull(message = "ERROR.CATEGORY.REQUIRED")
    Integer categoryId,

    @NotNull(message = "ERROR.PRODUCT_TYPE.REQUIRED")
    Integer productTypeId,

    String productTypeCode,

    @NotNull(message = "ERROR.UNIT.REQUIRED")
    Integer unitId,

    // Validare critică: Nu mai permitem null la TVA
    @NotNull(message = "ERROR.VAT.REQUIRED")
    Integer vatRateId,

    @NotNull(message = "ERROR.PRICE.REQUIRED")
    @PositiveOrZero(message = "ERROR.PRICE.INVALID")
    BigDecimal salePrice,

    BigDecimal purchasePrice,

    // Acesta va fi ignorat la scriere (suprascris de logică), dar îl lăsăm pt citire
    Boolean trackStock,
    
    Boolean isActive,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
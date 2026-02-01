package com.sellbit.domain.catalog.product;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductDTO(
    Integer id,
    String name,
    String barcode,
    Integer categoryId,
    Integer productTypeId,
    Integer unitId,
    Integer vatRateId,
    BigDecimal salePrice,
    BigDecimal purchasePrice,
    Boolean trackStock,
    Boolean isActive,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
}
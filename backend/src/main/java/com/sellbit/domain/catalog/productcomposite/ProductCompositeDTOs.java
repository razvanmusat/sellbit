package com.sellbit.domain.catalog.productcomposite;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class ProductCompositeDTOs {
    
    public record SaveCompositionRequest(
        @NotNull(message = "ERROR.PARENT_PRODUCT.REQUIRED")
        Integer parentProductId,
        
        @NotEmpty(message = "ERROR.COMPONENTS.EMPTY")
        @Valid // Validăm fiecare obiect din listă
        List<ComponentItemRequest> components
    ) {}

    public record ComponentItemRequest(
        @NotNull(message = "ERROR.CHILD_PRODUCT.REQUIRED")
        Integer childProductId,
        
        @NotNull(message = "ERROR.QUANTITY.REQUIRED")
        @DecimalMin(value = "0.001", message = "ERROR.QUANTITY.TOO_LOW")
        BigDecimal quantity
    ) {}

    public record CompositionResponse(
        Integer childProductId,
        String childProductName,
        BigDecimal quantity,
        String unitLabel
    ) {}
}
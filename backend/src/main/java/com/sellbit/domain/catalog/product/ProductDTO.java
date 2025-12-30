package com.sellbit.domain.catalog.product;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductDTO(
	    Integer id,
	    
	    @NotBlank(message = "ERROR.PRODUCT.NAME_REQUIRED")
	    @Size(max = 100)
	    String name,
	    	  
	    String barcode,
	    
	    @NotNull(message = "ERROR.PRODUCT.CATEGORY_REQUIRED")
	    Integer categoryId,
	    
	    @NotNull(message = "ERROR.PRODUCT.TYPE_REQUIRED")
	    Integer productTypeId,
	    
	    @NotNull(message = "ERROR.PRODUCT.UNIT_REQUIRED")
	    Integer unitId,
	    
	    Integer vatRateId,
	    
	    @PositiveOrZero(message = "ERROR.PRODUCT.INVALID_PRICE")
	    BigDecimal salePrice,
	    
	    Boolean trackStock,
	    Boolean isActive,
	    LocalDateTime createdAt,
	    LocalDateTime updatedAt
	) {}

package com.sellbit.domain.catalog.category;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoryDTO(
	    Integer id,
	    @NotBlank @Size(max = 50) String code,
	    @NotBlank @Size(max = 100) String label,
	    Integer parentId,
	    Boolean isActive,
	    LocalDateTime createdAt,
	    LocalDateTime updatedAt
	) {}

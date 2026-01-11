package com.sellbit.domain.security.user;

import java.time.LocalDateTime;

public record UserResponseDTO(
	    Integer id,
	    String username,
	    String fullName,
	    Integer roleId,
	    String roleLabel,
	    String roleCode,
	    Integer authorityLevel,
	    String languageCode,
	    boolean isActive,
	    LocalDateTime createdAt,
	    LocalDateTime deactivatedAt
	) {
	    public static UserResponseDTO fromEntity(User user) {
	    	if (user == null) return null;
	        return new UserResponseDTO(
	            user.getId(),
	            user.getUsername(),
	            user.getFullName(),
	            user.getRole().getId(),
	            user.getRole().getLabel(),
	            user.getRole().getCode(),
	            user.getRole().getAuthorityLevel(),
	            user.getLanguageCode(),
	            user.isActive(),
	            user.getCreatedAt(),
	            user.getDeactivatedAt()
	        );
	    }
	}


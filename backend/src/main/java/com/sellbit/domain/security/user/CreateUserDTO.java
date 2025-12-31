package com.sellbit.domain.security.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserDTO(
	    @NotBlank(message = "ERROR.USER.USERNAME_EMPTY")
	    String username,

	    @NotBlank(message = "ERROR.USER.PASSWORD_EMPTY")
	    String password,

	    @NotBlank(message = "ERROR.USER.FULLNAME_EMPTY")
	    String fullName,

	    @NotNull(message = "ERROR.USER.ROLE_REQUIRED")
	    Integer roleId,

	    String languageCode
	) {}

package com.sellbit.domain.security.auth;

import jakarta.validation.constraints.NotBlank;

public record AuthRequest(
    @NotBlank(message = "ERROR.AUTH.USERNAME_EMPTY")
    String username,
    
    @NotBlank(message = "ERROR.AUTH.PASSWORD_EMPTY")
    String password
) {}
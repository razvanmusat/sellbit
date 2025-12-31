package com.sellbit.domain.security.user;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordDTO(
    @NotBlank(message = "ERROR.USER.PASSWORD_EMPTY")
    String newPassword
) {}

package com.sellbit.domain.store;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public class StoreDTOs {

    public record SaveRequest(
        @NotBlank(message = "ERROR.STORE.NAME_REQUIRED")
        @Size(max = 100)
        String name,

        @NotBlank(message = "ERROR.STORE.ADDRESS_REQUIRED")
        @Size(max = 255)
        String address,

        @NotBlank(message = "ERROR.STORE.PHONE_REQUIRED")
        @Size(max = 50)
        String phone,

        @NotBlank(message = "ERROR.STORE.EMAIL_REQUIRED")
        @Email(message = "ERROR.STORE.EMAIL_INVALID")
        @Size(max = 100)
        String email,

        @NotBlank(message = "ERROR.STORE.VAT_REQUIRED")
        @Size(max = 50)
        String vatNumber,

        @NotBlank(message = "ERROR.STORE.REG_REQUIRED")
        @Size(max = 50)
        String registrationNumber,

        @Size(max = 50)
        String bankAccount
    ) {}

    public record Response(
        Integer id,
        String name,
        String address,
        String phone,
        String email,
        String vatNumber,
        String registrationNumber,
        String bankAccount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
    ) {}
}
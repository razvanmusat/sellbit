package com.sellbit.domain.security.user;

import java.time.LocalDateTime;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class UserDTOs {

    // --- 1. CREATE (Fără parolă, o generăm noi) ---
    public record Create(
            @NotBlank(message = "ERROR.USER.USERNAME_EMPTY")
            String username,

            @NotBlank(message = "ERROR.USER.FULLNAME_EMPTY")
            String fullName,

            @NotNull(message = "ERROR.USER.ROLE_REQUIRED")
            Integer roleId,

            String languageCode
    ) {}

    // --- 2. UPDATE ---
    public record Update(
            @NotBlank(message = "ERROR.USER.USERNAME_EMPTY")
            String username,

            @NotBlank(message = "ERROR.USER.FULLNAME_EMPTY")
            String fullName,

            @NotNull(message = "ERROR.USER.ROLE_REQUIRED")
            Integer roleId,

            String languageCode
    ) {}

    // --- 3. RESPONSE (Include tempPassword pt creare) ---
    public record Response(
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
            LocalDateTime deactivatedAt,
            String tempPassword // Populat doar la creare
    ) {
        public static Response fromEntity(User user) {
            if (user == null) return null;
            return new Response(
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
                    user.getDeactivatedAt(),
                    null // Implicit null la listări
            );
        }
        
        // Helper pentru cazul Create, când avem parolă temporară
        public static Response fromEntityWithPass(User user, String tempPass) {
            if (user == null) return null;
             return new Response(
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
                    user.getDeactivatedAt(),
                    tempPass
            );
        }
    }

    // --- 4. USER CHANGE OWN PASSWORD (Veche + Nouă) ---
    public record ChangeOwnPassword(
            @NotBlank(message = "ERROR.USER.OLD_PASSWORD_EMPTY")
            String oldPassword,

            @NotBlank(message = "ERROR.USER.NEW_PASSWORD_EMPTY")
            String newPassword
    ) {}
}
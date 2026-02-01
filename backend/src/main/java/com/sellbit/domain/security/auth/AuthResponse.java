package com.sellbit.domain.security.auth;

public record AuthResponse(
    String token,
    Integer id,
    String username,
    String fullName,
    String roleCode,    
    String roleLabel,     
    Integer authorityLevel 
) {}
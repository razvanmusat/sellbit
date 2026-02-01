package com.sellbit.domain.security.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import com.sellbit.domain.utils.Utils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository; // <--- AM ADĂUGAT ASTA

    public AuthResponse login(AuthRequest request) {
        // 1. Formatăm username-ul (ex: litere mici, trim)
        String formattedUsername = Utils.formatUsername(request.username());
        if (formattedUsername.isEmpty()) {
            throw new RuntimeException("ERROR.AUTH.INVALID_USERNAME");
        }

        // 2. Autentificăm prin Spring Security (verifică parola și dacă e activ)
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(formattedUsername, request.password())
        );

        // 3. Încărcăm UserDetails pentru generarea token-ului
        UserDetails userDetails = userDetailsService.loadUserByUsername(formattedUsername);
        String token = jwtUtils.generateToken(userDetails);

        // 4. Căutăm Entitatea User REALĂ pentru a extrage datele de profil (Nume, Rol)
        // Folosim orElseThrow, deși teoretic nu poate fi null dacă a trecut de autentificare
        User user = userRepository.findByUsername(formattedUsername)
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        // 5. Construim și returnăm răspunsul complex
        return new AuthResponse(
            token,
            user.getId(),
            user.getUsername(),
            user.getFullName(),
            user.getRole().getCode(),          // "ADMIN"
            user.getRole().getLabel(),         // "Administrator"
            user.getRole().getAuthorityLevel() // 100
        );
    }
}
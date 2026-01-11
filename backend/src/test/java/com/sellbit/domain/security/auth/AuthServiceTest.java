package com.sellbit.domain.security.auth;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private UserDetailsService userDetailsService;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("Login - Succes: Formatează username și returnează token")
    void login_Success() {
        // Dată de intrare cu diacritice și uppercase pentru a testa Utils.formatUsername
        AuthRequest request = new AuthRequest("Ștefan.TEST", "Pass123!");
        String expectedFormattedUsername = "stefan.test";
        
        UserDetails userDetails = new User(expectedFormattedUsername, "Pass123!", Collections.emptyList());

        when(userDetailsService.loadUserByUsername(expectedFormattedUsername)).thenReturn(userDetails);
        when(jwtUtils.generateToken(userDetails)).thenReturn("valid-token");

        String result = authService.login(request);

        assertEquals("valid-token", result);
        
        // Verificăm că s-a apelat autentificarea cu username-ul formatat
        verify(authenticationManager).authenticate(
            argThat(auth -> auth.getPrincipal().equals(expectedFormattedUsername))
        );
    }

    @Test
    @DisplayName("Login - Fail: Aruncă eroare la credențiale greșite")
    void login_Fail_BadCredentials() {
        AuthRequest request = new AuthRequest("user.test", "wrong-pass");

        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
        
        // Verificăm că nu se mai generează token dacă autentificarea a eșuat
        verifyNoInteractions(jwtUtils);
    }

    @Test
    @DisplayName("Login - Corner Case: Username null")
    void login_Fail_NullUsername() {
        // 1. Pregătim request-ul cu username null
        AuthRequest request = new AuthRequest(null, "Pass123!");
        
        // 2. Verificăm că AuthService aruncă RuntimeException conform liniei 25 din Service-ul tău
        RuntimeException exception = assertThrows(RuntimeException.class, () -> 
            authService.login(request)
        );
        
        // 3. Validăm și mesajul erorii pentru a fi siguri că e eroarea căutată
        assertEquals("ERROR.AUTH.INVALID_USERNAME", exception.getMessage());
        
        // 4. Verificăm că execuția s-a oprit înainte de a interacționa cu restul sistemului
        verifyNoInteractions(authenticationManager);
        verifyNoInteractions(userDetailsService);
        verifyNoInteractions(jwtUtils);
    }
}
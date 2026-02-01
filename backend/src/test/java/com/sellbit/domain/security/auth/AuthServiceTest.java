package com.sellbit.domain.security.auth;

import com.sellbit.domain.lookup.userrole.UserRole;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Collections;
import java.util.Optional;

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

    @Mock
    private UserRepository userRepository; // <--- NOU: Injectăm repo-ul

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("Login - Succes: Returnează DTO complet cu User și Rol")
    void login_Success() {
        // SETUP
        AuthRequest request = new AuthRequest("admin", "Pass123!");
        String formattedUsername = "admin";
        
        // Mock UserDetails (Spring Security)
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
            formattedUsername, "Pass123!", Collections.emptyList()
        );

        // Mock User Entity (Database)
        UserRole role = UserRole.builder().code("ADMIN").label("Administrator").authorityLevel(100).build();
        User userEntity = User.builder()
                .id(1)
                .username(formattedUsername)
                .fullName("Admin Test")
                .role(role)
                .build();

        // WHEN
        when(userDetailsService.loadUserByUsername(formattedUsername)).thenReturn(userDetails);
        when(jwtUtils.generateToken(userDetails)).thenReturn("valid-token");
        when(userRepository.findByUsername(formattedUsername)).thenReturn(Optional.of(userEntity));

        // ACT
        AuthResponse result = authService.login(request);

        // ASSERT
        assertNotNull(result);
        assertEquals("valid-token", result.token());
        assertEquals("ADMIN", result.roleCode()); // Verificăm că a mapat corect din UserEntity
        assertEquals(100, result.authorityLevel());
        
        verify(authenticationManager).authenticate(any());
    }

    @Test
    @DisplayName("Login - Fail: Aruncă eroare la credențiale greșite")
    void login_Fail_BadCredentials() {
        AuthRequest request = new AuthRequest("user", "wrong");

        when(authenticationManager.authenticate(any()))
            .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> authService.login(request));
        
        verifyNoInteractions(jwtUtils);
        verifyNoInteractions(userRepository);
    }

    @Test
    @DisplayName("Login - Corner Case: Username invalid (null/empty)")
    void login_Fail_InvalidUsername() {
        AuthRequest request = new AuthRequest(null, "Pass");
        
        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("ERROR.AUTH.INVALID_USERNAME", ex.getMessage());
        
        verifyNoInteractions(authenticationManager);
    }

    @Test
    @DisplayName("Login - CRITIC: Autentificare reușită, dar User lipsă în DB (Inconsistency)")
    void login_Fail_UserNotFoundInDb() {
        // Scenariu: Userul există în cache-ul Spring Security sau LDAP, dar a fost șters manual din tabela 'users'
        AuthRequest request = new AuthRequest("ghost", "Pass");
        String formattedUsername = "ghost";
        
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
            formattedUsername, "Pass", Collections.emptyList()
        );

        // Trece de login
        when(userDetailsService.loadUserByUsername(formattedUsername)).thenReturn(userDetails);
        when(jwtUtils.generateToken(userDetails)).thenReturn("token");
        
        // DAR nu e găsit în repository
        when(userRepository.findByUsername(formattedUsername)).thenReturn(Optional.empty());

        // Trebuie să arunce eroare
        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("ERROR.USER.NOT_FOUND", ex.getMessage());
    }
}
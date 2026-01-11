package com.sellbit.domain.security.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import com.sellbit.domain.utils.Utils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;
   

    public String login(AuthRequest request) {
        String formattedUsername = Utils.formatUsername(request.username());
        if (formattedUsername.isEmpty()) {
            throw new RuntimeException("ERROR.AUTH.INVALID_USERNAME");
        }
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(formattedUsername, request.password())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(formattedUsername);

        return jwtUtils.generateToken(userDetails);
    }
}
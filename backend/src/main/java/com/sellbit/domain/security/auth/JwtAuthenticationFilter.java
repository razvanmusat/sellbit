package com.sellbit.domain.security.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // 1. Dacă nu avem header sau nu începe cu Bearer, trecem direct la următorul filtru
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        try {
            // 2. Încercăm să extragem username-ul. 
            // Dacă token-ul este expirat, Jwts va arunca ExpiredJwtException aici.
            username = jwtUtils.extractUsername(jwt);

            // 3. Dacă avem username și nu suntem deja autentificați
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                
                // 4. Verificăm validitatea (inclusiv data de expirare din nou, preventiv)
                if (jwtUtils.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // 5. Autentificăm utilizatorul în context
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            // Dacă token-ul a expirat sau e invalid, prindem eroarea aici.
            // NU aruncăm excepția mai departe, pentru a permite rutei de /login să proceseze cererea.
            logger.warn("JWT validation failed: " + e.getMessage());
        }

        // 6. CONTINUĂM filtrul indiferent dacă token-ul a fost valid sau nu.
        // Dacă e expirat, contextul rămâne gol, dar ruta de /login fiind permitAll va funcționa.
        filterChain.doFilter(request, response);
    }
}
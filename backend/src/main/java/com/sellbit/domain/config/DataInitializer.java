package com.sellbit.domain.config;

import com.sellbit.domain.lookup.userrole.UserRole;
import com.sellbit.domain.lookup.userrole.UserRoleRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import com.sellbit.domain.utils.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserRoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Dacă există deja useri, nu facem nimic
        if (userRepository.count() > 0) {
            return;
        }

        log.info("--- INITIALIZARE ADMIN DEFAULT ---");

        // 1. Asigurăm rolul de Admin
        UserRole adminRole = roleRepository.findByCode("ADMIN")
                .orElseGet(() -> {
                    UserRole newRole = new UserRole();
                    newRole.setCode("ADMIN");
                    newRole.setLabel("Administrator");
                    newRole.setAuthorityLevel(100);
                    return roleRepository.save(newRole);
                });

        // 2. Generăm parolă temporară
        String tempPass = Utils.generateTempPassword();

        // 3. Creăm userul (folosim admin.sys ca să respecte validarea ta cu punct)
        User admin = User.builder()
                .username("admin")
                .fullName("Administrator")
                .role(adminRole)
                .passwordHash(passwordEncoder.encode(tempPass))
                .languageCode("ro")
                .isActive(true)
                .build();

        userRepository.save(admin);

        log.info("===========================================");
        log.info(" ADMIN CREAT: ");
        log.info(" Username: admin");
        log.info(" Password: " + tempPass);
        log.info("===========================================");
    }
}
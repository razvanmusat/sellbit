package com.sellbit.domain.security.user;

import com.sellbit.domain.lookup.userrole.UserRole;
import com.sellbit.domain.lookup.userrole.UserRoleRepository;
import com.sellbit.domain.utils.Utils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Validated
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserRoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserDTOs.Response> getAllActive() {
        return userRepository.findAllByIsActiveTrue().stream()
                .map(UserDTOs.Response::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDTOs.Response> getAllInactive() {
        return userRepository.findAllByIsActiveFalse().stream()
                .map(UserDTOs.Response::fromEntity)
                .collect(Collectors.toList());
    }

    // --- CREATE USER (Cu generare parolă) ---
    @Transactional
    public UserDTOs.Response create(@Valid UserDTOs.Create dto) {
        String username = Utils.formatUsername(dto.username());

        if (!Utils.isValidUsernameFormat(username)) {
            throw new RuntimeException("ERROR.USER.INVALID_USERNAME_FORMAT");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("ERROR.USER.DUPLICATE");
        }

        // 1. Generăm parolă temporară (4 chars)
        String tempPassword = Utils.generateTempPassword();

        UserRole role = roleRepository.findById(dto.roleId())
                .orElseThrow(() -> new RuntimeException("ERROR.ROLE.NOT_FOUND"));

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .fullName(Utils.formatFullName(dto.fullName()))
                .role(role)
                .languageCode(dto.languageCode() != null ? dto.languageCode() : "ro")
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        // 2. Returnăm DTO-ul care conține parola temporară
        return UserDTOs.Response.fromEntityWithPass(savedUser, tempPassword);
    }

    @Transactional
    public UserDTOs.Response update(Integer id, @Valid UserDTOs.Update dto) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        String username = Utils.formatUsername(dto.username());
        if (!Utils.isValidUsernameFormat(username)) {
            throw new RuntimeException("ERROR.USER.INVALID_USERNAME_FORMAT");
        }
        if (!username.equals(user.getUsername()) && userRepository.existsByUsername(username)) {
            throw new RuntimeException("ERROR.USER.DUPLICATE");
        }

        UserRole role = roleRepository.findById(dto.roleId())
                .orElseThrow(() -> new RuntimeException("ERROR.ROLE.NOT_FOUND"));

        if (user.getRole().getAuthorityLevel() == 100 && role.getAuthorityLevel() != 100) {
            long activeAdmins = userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100);
            if (user.isActive() && activeAdmins <= 1) {
                throw new RuntimeException("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN");
            }
        }

        user.setUsername(username);
        user.setFullName(Utils.formatFullName(dto.fullName()));
        user.setRole(role);
        if (dto.languageCode() != null) {
            user.setLanguageCode(dto.languageCode());
        }

        return UserDTOs.Response.fromEntity(userRepository.save(user));
    }

    @Transactional
    public UserDTOs.Response toggleStatus(Integer id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        if (user.getRole().getAuthorityLevel() == 100 && user.isActive()) {
            long activeAdmins = userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100);
            if (activeAdmins <= 1) {
                throw new RuntimeException("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN");
            }
        }

        user.setActive(!user.isActive());
        user.setDeactivatedAt(user.isActive() ? null : LocalDateTime.now());

        return UserDTOs.Response.fromEntity(userRepository.save(user));
    }

    // --- RESET PASSWORD (ADMIN) ---
    // Generează o nouă parolă random și o returnează Adminului
    @Transactional
    public UserDTOs.Response resetPassword(Integer id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        String tempPassword = Utils.generateTempPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        
        User savedUser = userRepository.save(user);

        // Returnăm DTO-ul CU parola nouă
        return UserDTOs.Response.fromEntityWithPass(savedUser, tempPassword);
    }

    // --- CHANGE OWN PASSWORD (USER) ---
    // Userul logat își schimbă parola
    @Transactional
    public void changeOwnPassword(String currentUsername, @Valid UserDTOs.ChangeOwnPassword dto) {
        User user = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        // 1. Verificăm parola veche (temporară)
        if (!passwordEncoder.matches(dto.oldPassword(), user.getPasswordHash())) {
            throw new RuntimeException("ERROR.AUTH.WRONG_OLD_PASSWORD");
        }

        // 2. Validăm parola nouă (trebuie să fie strong)
        if (!Utils.isValidPassword(dto.newPassword())) {
            throw new RuntimeException("ERROR.USER.INVALID_PASSWORD_STRENGTH");
        }

        user.setPasswordHash(passwordEncoder.encode(dto.newPassword()));
        userRepository.save(user);
    }
}
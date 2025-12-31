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

    // --- LISTARE USERS ---
    public List<UserResponseDTO> getAllActive() {
        return userRepository.findAllByIsActiveTrue().stream()
                .map(UserResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public List<UserResponseDTO> getAllInactive() {
        return userRepository.findAllByIsActiveFalse().stream()
                .map(UserResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    // --- CREATE USER ---
    @Transactional
    public UserResponseDTO create(@Valid CreateUserDTO dto) {
        String username = Utils.formatUsername(dto.username());
        if (!Utils.isValidUsernameFormat(username)) {
            throw new RuntimeException("ERROR.USER.INVALID_USERNAME_FORMAT");
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("ERROR.USER.DUPLICATE");
        }
        if (!Utils.isValidPassword(dto.password())) {
            throw new RuntimeException("ERROR.USER.INVALID_PASSWORD_STRENGTH");
        }

        UserRole role = roleRepository.findById(dto.roleId())
                .orElseThrow(() -> new RuntimeException("ERROR.ROLE.NOT_FOUND"));

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(dto.password()))
                .fullName(Utils.formatFullName(dto.fullName()))
                .role(role)
                .languageCode(dto.languageCode() != null ? dto.languageCode() : "ro")
                .isActive(true)
                .build();

        return UserResponseDTO.fromEntity(userRepository.save(user));
    }

    // --- UPDATE USER ---
    @Transactional
    public UserResponseDTO update(Integer id, @Valid UpdateUserDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        // Username editabil, validat
        String username = Utils.formatUsername(dto.username());
        if (!Utils.isValidUsernameFormat(username)) {
            throw new RuntimeException("ERROR.USER.INVALID_USERNAME_FORMAT");
        }
        if (!username.equals(user.getUsername()) && userRepository.existsByUsername(username)) {
            throw new RuntimeException("ERROR.USER.DUPLICATE");
        }

        UserRole role = roleRepository.findById(dto.roleId())
                .orElseThrow(() -> new RuntimeException("ERROR.ROLE.NOT_FOUND"));

        user.setUsername(username);
        user.setFullName(Utils.formatFullName(dto.fullName()));
        user.setRole(role);
        if (dto.languageCode() != null) {
            user.setLanguageCode(dto.languageCode());
        }

        return UserResponseDTO.fromEntity(userRepository.save(user));
    }

    // --- TOGGLE STATUS ---
    @Transactional
    public UserResponseDTO toggleStatus(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        // Protecție ultimul admin activ
        if (user.getRole().getAuthorityLevel() == 100 && user.isActive()) {
            long activeAdmins = userRepository.countByRole_AuthorityLevelAndIsActiveTrue(100);
            if (activeAdmins <= 1) {
                throw new RuntimeException("ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN");
            }
        }

        user.setActive(!user.isActive());
        user.setDeactivatedAt(user.isActive() ? null : LocalDateTime.now());

        return UserResponseDTO.fromEntity(userRepository.save(user));
    }

    // --- CHANGE PASSWORD ---
    @Transactional
    public void changePassword(Integer id, @Valid ChangePasswordDTO dto) {
        if (!Utils.isValidPassword(dto.newPassword())) {
            throw new RuntimeException("ERROR.USER.INVALID_PASSWORD_STRENGTH");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        user.setPasswordHash(passwordEncoder.encode(dto.newPassword()));
        userRepository.save(user);
    }
}

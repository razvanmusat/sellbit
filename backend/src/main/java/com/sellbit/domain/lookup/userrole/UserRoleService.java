package com.sellbit.domain.lookup.userrole;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import com.sellbit.domain.security.user.UserRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Service
@Validated
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRoleRepository repository;
    private final UserRepository userRepository;

    public List<UserRole> getAll() {
        return repository.findAll();
    }

    public List<UserRole> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public UserRole save(@Valid UserRole role) {
    	if (role.getId() != null && !repository.existsById(role.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(role);
    }

    @Transactional
    public void deleteLogical(Integer id) {

        UserRole role = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);

        // Protecție: ultimul rol cu autoritate maximă
        if (role.getAuthorityLevel() == 100) {
            long activeMaxRoles =
                repository.countByAuthorityLevelAndIsActiveTrue(100);

            if (activeMaxRoles <= 1) {
                throw new RuntimeException("ERROR.ROLE.CANNOT_DEACTIVATE_LAST_ADMIN_ROLE");
            }
        }

        // Protecție: rol folosit de useri activi
        if (userRepository.existsByRole_IdAndIsActiveTrue(id)) {
            throw new RuntimeException("ERROR.ROLE.IN_USE");
        }

        role.setActive(false);
        repository.save(role);
    }

}
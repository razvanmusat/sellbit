package com.sellbit.domain.lookup.userrole;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleService {

    private final UserRoleRepository repository;

    public List<UserRole> getAll() {
        return repository.findAll();
    }

    public List<UserRole> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public UserRole save(UserRole role) {
        return repository.save(role);
    }

    @Transactional
    public void deleteLogical(Integer id) {
        repository.findById(id).ifPresent(role -> {
            role.setActive(false);
            repository.save(role);
        });
    }
}
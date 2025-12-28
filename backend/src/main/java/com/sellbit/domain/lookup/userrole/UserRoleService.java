package com.sellbit.domain.lookup.userrole;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

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
    	if (role.getId() != null && !repository.existsById(role.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(role);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	UserRole role = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        role.setActive(false);
        repository.save(role);
    }
}
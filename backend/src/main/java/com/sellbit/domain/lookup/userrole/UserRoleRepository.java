package com.sellbit.domain.lookup.userrole;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Integer> {
    Optional<UserRole> findByCode(String code);
    List<UserRole> findAllByIsActiveTrue();
    boolean existsByIdAndIsActiveTrue(Integer id);
    long countByAuthorityLevelAndIsActiveTrue(Integer authorityLevel);

}
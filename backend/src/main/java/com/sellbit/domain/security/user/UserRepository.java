package com.sellbit.domain.security.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.username = :username")
    Optional<User> findByUsername(@Param("username") String username);

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.isActive = true")
    List<User> findAllByIsActiveTrue();

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.isActive = false")
    List<User> findAllByIsActiveFalse();

    boolean existsByUsername(String username);

    long countByRole_AuthorityLevelAndIsActiveTrue(Integer authorityLevel);

    boolean existsByRole_IdAndIsActiveTrue(Integer id);

    @Query("SELECT u FROM User u JOIN FETCH u.role WHERE u.role.code = :roleCode AND u.isActive = true")
    List<User> findByRoleCodeAndIsActiveTrue(@Param("roleCode") String roleCode);
}
package com.sellbit.domain.security.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    
    // Caută în toată tabela (activi/inactivi) pentru login și validare unicitate
    Optional<User> findByUsername(String username);
    
    // Pentru dropdown-uri în operarea curentă (vânzări, gestiune)
    List<User> findAllByIsActiveTrue();
    
    // Pentru panoul de admin: filtrare rapidă după status
    List<User> findAllByIsActiveFalse();

    boolean existsByUsername(String username);

    long countByRole_AuthorityLevelAndIsActiveTrue(Integer authorityLevel);

	boolean existsByRole_IdAndIsActiveTrue(Integer id);
}
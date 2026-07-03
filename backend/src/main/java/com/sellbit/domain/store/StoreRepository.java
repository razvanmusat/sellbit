package com.sellbit.domain.store;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StoreRepository extends JpaRepository<Store, Integer> {

    /**
     * Returnează singura înregistrare cu setările firmei.
     * Folosim stream().findFirst() pentru a extrage direct obiectul, nu o listă.
     */
    default Optional<Store> getSettings() {
        return findAll().stream().findFirst();
    }

    /**
     * Verifică rapid dacă magazinul a fost configurat.
     * Util pentru logica de First Run Setup.
     */
    default boolean isConfigured() {
        return count() > 0;
    }
}
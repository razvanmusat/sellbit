package com.sellbit.domain.catalog.category;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {

    // --- NAVIGARE ADMIN (Include și categoriile inactive) ---

    /** Returnează categoriile rădăcină pentru structura arborescentă din Admin */
    List<Category> findByParentIsNullOrderByLabelAsc();

    /** Returnează subcategoriile unui părinte specific pentru Admin */
    List<Category> findByParentIdOrderByLabelAsc(Integer parentId);


    // --- NAVIGARE POS / VÂNZARE (Doar categoriile ACTIVE) ---

    /** * Pasul 1: Obține categoriile principale active (ex: Produse, Meniuri, Servicii).
     * Folosită la încărcarea inițială a paginii de vânzare.
     */
    List<Category> findByParentIsNullAndIsActiveTrueOrderByLabelAsc();

    /** * Pasul 2: Obține subcategoriile active pentru un părinte selectat.
     * Folosită când casierul apasă pe o categorie și vrea să vadă ce conține.
     */
    List<Category> findByParentIdAndIsActiveTrueOrderByLabelAsc(Integer parentId);

    /** * Pasul 3: Verifică dacă o categorie are subcategorii active.
     * Esențial pentru DTO (hasChildren) pentru a știi dacă afișăm subcategorii sau produse la click.
     */
    boolean existsByParent_IdAndIsActiveTrue(Integer parentId);


    // --- VALIDĂRI ȘI CĂUTARE ---

    /** Verifică existența codului la creare/editare */
    boolean existsByCode(String code);

    /** Căutare după cod unic */
    Optional<Category> findByCode(String code);

    /** Verifică dacă există orice fel de subcategorie (folosit în logica de business) */
    boolean existsByParent_Id(Integer parentId);


    // --- REPOZITOARE SPECIFICE / RAPOARTE ---

    /** Returnează absolut toate categoriile ordonate alfabetic */
    List<Category> findAllByOrderByLabelAsc();

    /** Returnează toate categoriile active ca listă plată (util pentru căutare globală) */
    List<Category> findByIsActiveTrueOrderByLabelAsc();

    /** * Obține doar categoriile finale (frunză). 
     * Folosit în "Mutare Produs" pentru a arăta doar destinațiile care nu au subcategorii.
     */
    @Query("SELECT c FROM Category c WHERE NOT EXISTS (SELECT 1 FROM Category sub WHERE sub.parent = c) ORDER BY c.label ASC")
    List<Category> findLeafCategories();
}
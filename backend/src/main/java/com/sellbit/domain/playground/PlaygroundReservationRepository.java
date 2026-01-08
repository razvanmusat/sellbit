package com.sellbit.domain.playground;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PlaygroundReservationRepository extends JpaRepository<PlaygroundReservation, Integer> {

    /**
     * Caută rezervări care se suprapun cu intervalul dat.
     * Logica: (StartA < EndB) AND (EndA > StartB)
     */
    @Query("SELECT r FROM PlaygroundReservation r WHERE " +
           "(r.startAt < :endAt AND r.endAt > :startAt)")
    List<PlaygroundReservation> findOverlappingReservations(
            @Param("startAt") LocalDateTime startAt, 
            @Param("endAt") LocalDateTime endAt);

    /**
     * Găsește toate rezervările pentru o anumită perioadă (ex: o zi întreagă).
     * Folosit pentru popularea Grid-ului în Frontend.
     */
    List<PlaygroundReservation> findByStartAtBetweenOrderByStartAtAsc(
            LocalDateTime start, LocalDateTime end);
    
 // Adaugă asta în PlaygroundReservationRepository
    @Query("SELECT r FROM PlaygroundReservation r WHERE " +
           "r.id != :currentId AND (r.startAt < :endAt AND r.endAt > :startAt)")
    List<PlaygroundReservation> findOverlappingReservationsExcludingSelf(
            @Param("startAt") LocalDateTime startAt, 
            @Param("endAt") LocalDateTime endAt, 
            @Param("currentId") Integer currentId);
}
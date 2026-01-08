package com.sellbit.domain.catering.cateringorder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CateringOrderRepository extends JpaRepository<CateringOrder, Integer> {

    /**
     * Returnează toate comenzile pentru o zi specifică.
     * Folosit pentru Grid-ul de rezervări (pentru a vedea care are catering) 
     * și pentru lista zilnică de livrări.
     */
    List<CateringOrder> findByOrderDateOrderByCreatedAtAsc(LocalDate date);

    /**
     * Găsește toate comenzile neplătite către furnizor într-un interval de timp.
     * Esențial pentru funcția de "Bulk Pay" a Adminului.
     */
    List<CateringOrder> findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(LocalDate start, LocalDate end);

    /**
     * Găsește o comandă specifică bazată pe rezervare.
     * Utit pentru a preveni dublarea comenzilor pentru aceeași petrecere.
     */
    Optional<CateringOrder> findByReservationId_Id(Integer reservationId);

    /**
     * Update bulk pentru marcarea plăților.
     * Folosim o metodă optimizată pentru a nu face save() în buclă în Service.
     */
    @Modifying
    @Query("UPDATE CateringOrder c SET c.isPaid = true, c.paidAt = :paidAt WHERE c.id IN :ids")
    void markAsPaidBulk(@Param("ids") List<Integer> ids, @Param("paidAt") LocalDateTime paidAt);
}
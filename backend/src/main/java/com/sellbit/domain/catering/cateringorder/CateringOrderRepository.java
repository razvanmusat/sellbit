package com.sellbit.domain.catering.cateringorder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CateringOrderRepository extends JpaRepository<CateringOrder, Integer> {

    @Query("SELECT o FROM CateringOrder o " +
            "JOIN FETCH o.product p " +
            "WHERE o.orderDate = :date " +
            "ORDER BY o.createdAt ASC")
    List<CateringOrder> findByOrderDateOrderByCreatedAtAsc(@Param("date") LocalDate date);

    List<CateringOrder> findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(LocalDate start, LocalDate end);

    @Modifying
    @Query("UPDATE CateringOrder c SET c.isPaid = true, c.paidAt = :paidAt WHERE c.id IN :ids")
    void markAsPaidBulk(@Param("ids") List<Integer> ids, @Param("paidAt") LocalDateTime paidAt);

    @Modifying
    @Query("UPDATE CateringOrder co SET co.orderDate = :newDate WHERE co.reservationId.id = :reservationId")
    void moveOrdersToDateJPQL(@Param("reservationId") Integer reservationId, @Param("newDate") LocalDate newDate);
}

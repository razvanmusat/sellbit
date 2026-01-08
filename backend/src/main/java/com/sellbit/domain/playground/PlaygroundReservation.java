package com.sellbit.domain.playground;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "playground_reservations")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PlaygroundReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Column(name = "parent_name", nullable = false, length = 100)
    private String parentName;

    @Column(name = "parent_phone", nullable = false, length = 30)
    private String parentPhone;

    @Column(name = "advance_amount", precision = 10, scale = 2)
    private BigDecimal advanceAmount;

    @Column(name = "advance_paid_at")
    private LocalDateTime advancePaidAt;

    @Builder.Default
    @Column(name = "digital_invitation", nullable = false)
    private Boolean digitalInvitation = false;

    @Column(length = 100)
    private String theme;

    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
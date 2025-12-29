package com.sellbit.domain.lookup.unitofmeasure;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "units_of_measure")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnitOfMeasure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // EX: BUC, HOUR, MINUTE

    @Column(nullable = false, length = 100)
    private String label; // EX: Bucată, Ora(acces loc de joaca), Minute(extra)

    @Builder.Default
    @Column(name = "is_active")
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
package com.sellbit.domain.lookup.vatrate;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vat_rates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class VatRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String code; // EX: TVA21, TV11, TVA0

    @Column(nullable = false, length = 100)
    private String label; // "TVA 21% (Băuturi/Jucării)", "TVA 11% (Alimente)",  "Scutit"

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal rate; // EX: 21.00,11.00, 0.00

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
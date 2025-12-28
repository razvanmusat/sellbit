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
    private String code; // EX: TVA19, TVA9, TVA5

    @Column(nullable = false, length = 100)
    private String label; // EX: Cota Normala 19%

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal rate; // EX: 19.00, 9.00

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
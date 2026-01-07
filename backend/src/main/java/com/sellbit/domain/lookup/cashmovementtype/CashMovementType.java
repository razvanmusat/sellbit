package com.sellbit.domain.lookup.cashmovementtype;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_movement_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashMovementType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    /**
     * Coduri standard utilizate în aplicație:
     * SALE: Încasare bon fiscal
     * REFUND: Returnare bani client (storno numerar)
     * REFUND_CARD: Returnare bani client (storno card)
     * PAYMENT_SUPPLIER: Plată furnizor din cash
     * BANK_DEPOSIT: Depunere numerar la bancă
     * CASH_IN: Alimentare
     * CASH_OUT: Cheltuieli diverse/administrative
     */
    @Column(nullable = false, unique = true, length = 50)
    private String code; // EX: PAYIN, PAYOUT

    @Column(nullable = false, length = 100)
    private String label; // EX: Introducere numerar, Depunere numerar banca

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
package com.sellbit.domain.cash.cashmovement;

import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.cashmovementtype.CashMovementType;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.security.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movement_type_id", nullable = false)
    private CashMovementType movementType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount; // Pozitiv (+) pentru intrări, Negativ (-) pentru ieșiri

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    @Column(columnDefinition = "TEXT")
    private String note;
}
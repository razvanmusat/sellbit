package com.sellbit.domain.cash.cashdrawer;

import com.sellbit.domain.inventory.warehouse.Warehouse;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "cash_drawer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashDrawer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false, unique = true)
    private Warehouse warehouse;

    @Builder.Default
    @Column(name = "current_balance", precision = 10, scale = 2, nullable = false)
    private BigDecimal currentBalance = BigDecimal.ZERO;
}
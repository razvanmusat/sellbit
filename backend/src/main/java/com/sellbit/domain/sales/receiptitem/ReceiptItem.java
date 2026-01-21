package com.sellbit.domain.sales.receiptitem;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.sales.receipt.Receipt;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "receipt_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReceiptItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id", nullable = false)
    private Receipt receipt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(precision = 10, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "purchase_unit_price", precision = 10, scale = 2)
    private BigDecimal purchaseUnitPrice;

    @Column(name = "line_total", precision = 10, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "vat_rate", precision = 5, scale = 2)
    private BigDecimal vatRate;

    @Column(name = "net_total", precision = 10, scale = 2)
    private BigDecimal netTotal;

    @Column(name = "vat_total", precision = 10, scale = 2)
    private BigDecimal vatTotal;

    @Column(name = "service_end_at") //Data de finalizare a serviciului cu timp asociat
    private LocalDateTime serviceEndAt;

    @Builder.Default
    @Column(name = "is_service_time") //Indicativ produs cu timp asociat
    private boolean isServiceTime = false;
}
package com.sellbit.domain.sales.receipt;

import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.cancelreason.CancelReason;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.security.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "receipts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Receipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_id", nullable = false)
    private ReceiptStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_receipt_id")
    private Receipt originalReceipt; // Referință către bonul stornat (self-reference)

    @Column(name = "table_name", length = 50)
    private String tableName;

    @Column(name = "total_amount", precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "total_net", precision = 10, scale = 2)
    private BigDecimal totalNet;

    @Column(name = "total_vat", precision = 10, scale = 2)
    private BigDecimal totalVat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancel_reason_id")
    private CancelReason cancelReason;

    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // Relații bidirecționale cu gestionare în cascadă
    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReceiptItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ReceiptPayment> payments = new ArrayList<>();

    /**
     * Adaugă un produs pe bon și setează relația inversă.
     */
    public void addItem(ReceiptItem item) {
        items.add(item);
        item.setReceipt(this);
    }

    /**
     * Adaugă o metodă de plată și setează relația inversă.
     */
    public void addPayment(ReceiptPayment payment) {
        payments.add(payment);
        payment.setReceipt(this);
    }
}
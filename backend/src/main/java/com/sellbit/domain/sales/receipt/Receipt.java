package com.sellbit.domain.sales.receipt;

import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.cancelreason.CancelReason;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.security.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
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
    @JoinColumn(name = "warehouse_id")
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

    @Column(name = "is_internal_correction", nullable = false)
    @Builder.Default
    private boolean internalCorrection = false;

    // job_id primit de la Fisco la acceptarea comenzii de print — sursă de adevăr 1:1 pentru
    // verificarea de status (GET /api/v1/status?job_id=...), per manualul Fisco.
    @Column(name = "fiscal_job_id", length = 100)
    private String fiscalJobId;

    // Cel mai nou job_id cunoscut de Fisco, persistat ÎNAINTE de POST /api/v1/print.
    // Dacă răspunsul la POST se pierde (fiscal_job_id rămâne null), reconcilierea compară
    // lista de joburi Fisco cu acest reper: exact un job mai nou = jobul nostru pierdut
    // (îl adoptăm); zero joburi noi = Fisco n-a primit nimic (retrimitere sigură).
    // Valoarea "NONE" = istoricul Fisco era gol la momentul snapshotului (diferit de null,
    // care înseamnă că nu s-a trimis nimic pentru bonul ăsta).
    @Column(name = "fiscal_snapshot_job_id", length = 100)
    private String fiscalSnapshotJobId;

    // Datele fiscale din răspunsul "printed" al Fisco, salvate per recomandarea explicită din
    // manual (2.2): leagă bonul din aplicație de bonul fizic din memoria fiscală a casei.
    @Column(name = "fiscal_slip_number", length = 20)
    private String fiscalSlipNumber; // SlipNumber: numărul general al bonului fiscal

    @Column(name = "fiscal_z_report_number", length = 20)
    private String fiscalZReportNumber; // nZrep: numărul raportului Z în care e inclus bonul

    @Column(name = "fiscal_bon_number", length = 20)
    private String fiscalBonNumber; // nFNum: numărul bonului fiscal din raportul Z

    @Column(name = "fiscal_device_serial", length = 50)
    private String fiscalDeviceSerial; // DeviceSerial: seria imprimantei fiscale

    // Relații bidirecționale cu gestionare în cascadă
    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    @Builder.Default
    private List<ReceiptItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
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
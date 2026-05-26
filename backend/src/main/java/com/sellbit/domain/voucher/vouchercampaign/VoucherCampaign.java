package com.sellbit.domain.voucher.vouchercampaign;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "voucher_campaigns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VoucherCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "valid_from_date", nullable = false)
    private LocalDate validFromDate;

    @Column(name = "valid_until_date", nullable = false)
    private LocalDate validUntilDate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "discount_type", length = 50)
    private String discountType;

    @Column(name = "discount_value", precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount_amount", precision = 10, scale = 2)
    private BigDecimal maxDiscountAmount; // Nullable; obligatoriu doar pentru PERCENT discount (validare in service)

    // --- CONDIȚII EMITERE ---
    @Column(name = "min_hours_played")
    private Integer minHoursPlayed;

    @Column(name = "min_amount", precision = 10, scale = 2)
    private BigDecimal minAmount;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "required_product_ids", columnDefinition = "integer[]")
    private List<Integer> requiredProductIds;
    
    @Column(name = "applicable_product_id") //ex: free hour
    private Integer applicableProductId;

    // --- CONDIȚII UTILIZARE ---
    @Builder.Default
    @Column(name = "valid_days", nullable = false)
    private Integer validDays = 30;

    @Column(name = "applicable_days", length = 50)
    private String applicableDays; // Stocat ca "3,4" (Miercuri, Joi)

    // --- CONFIGURARE COD ---
    @Builder.Default
    @Column(length = 20)
    private String prefix = "JOACA-";

    @Builder.Default
    @Column(name = "code_length", nullable = false)
    private Integer codeLength = 4;

    @Column(name = "receipt_template", columnDefinition = "TEXT")
    private String receiptTemplate;

    // --- TIP CAMPANIE ---
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_type_id", nullable = false)
    private CampaignType campaignType;

    // --- EMITERE MULTIPLA (REGULAR) ---
    @Builder.Default
    @Column(name = "vouchers_per_receipt", nullable = false)
    private Integer vouchersPerReceipt = 1;

    // --- STAMPILE (LOYALTY) ---
    @Column(name = "stamps_required")
    private Integer stampsRequired;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
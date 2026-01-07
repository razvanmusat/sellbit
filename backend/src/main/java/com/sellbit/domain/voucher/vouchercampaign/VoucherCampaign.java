package com.sellbit.domain.voucher.vouchercampaign;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    // --- CONDIȚII EMITERE ---
    @Column(name = "min_hours_played")
    private Integer minHoursPlayed;

    @Column(name = "min_amount", precision = 10, scale = 2)
    private BigDecimal minAmount;

    @Column(name = "required_product_id") //produs necesar pe bon pt validare
    private Integer requiredProductId;
    
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

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
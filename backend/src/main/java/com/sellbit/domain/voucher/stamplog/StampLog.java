package com.sellbit.domain.voucher.stamplog;

import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaign;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.sales.receipt.Receipt;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "stamp_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StampLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private VoucherCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cashier_id")
    private User cashier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    @CreationTimestamp
    @Column(name = "given_at", updatable = false, nullable = false)
    private LocalDateTime givenAt;
}

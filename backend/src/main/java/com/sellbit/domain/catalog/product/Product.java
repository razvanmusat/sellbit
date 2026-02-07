package com.sellbit.domain.catalog.product;


import com.sellbit.domain.catalog.category.Category;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasure;
import com.sellbit.domain.lookup.vatrate.VatRate;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "products")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Builder
public class Product {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Integer id;
	
	@Column(nullable = false, length = 100)
	private String name;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "category_id", nullable = false)
	private Category category;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "product_type_id", nullable = false)
	private ProductType productType;
	
	@Column(unique = true, length = 50)
	private String barcode;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "unit_id", nullable = false)
	private UnitOfMeasure unit;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "vat_rate_id", nullable = false)
	private VatRate vatRate;
	
	// Prețul de vânzare final (include TVA).
	@Column(name = "sale_price", precision = 10, scale = 2)
	private BigDecimal salePrice;
	
	// Prețul de achiziție sau costul fix (folosit momentan doar pentru Catering)
    @Column(name = "purchase_price", precision = 10, scale = 2)
    private BigDecimal purchasePrice;

	@Builder.Default
	@Column(name = "track_stock", nullable = false)
	private Boolean trackStock = true;
	
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

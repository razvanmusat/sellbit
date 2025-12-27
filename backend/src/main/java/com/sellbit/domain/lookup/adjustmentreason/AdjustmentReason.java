package com.sellbit.domain.lookup.adjustmentreason;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "adjustment_reason")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdjustmentReason {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Integer id;
	
	@Column(nullable = false, unique = true, length = 50)
	private String code; //EX: INVENTORY, BROKEN, EXPIRED
	
	@Column(nullable = false, length = 50)
	private String label; // displayed name
	
	@Builder.Default
	@Column(name = "is_active")
	private boolean isActive = true;
	
	@CreationTimestamp
	@Column(name = "created_at", updatable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	@Column(name = "updated_at")
	private LocalDateTime updatedAt;	
	
}

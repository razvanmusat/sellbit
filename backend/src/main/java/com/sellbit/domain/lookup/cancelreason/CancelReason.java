package com.sellbit.domain.lookup.cancelreason;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "cancel_reasons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancelReason {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Integer id;
	
	@Column(nullable = false, unique = true, length = 50)
	private String code; // EX: CUSTOMER_REJECTION, ERROR_ENTRY, WRONG_ITEM
	
	@Column(nullable = false, length = 100)
	private String label; //EX: Refuz client, Eroare operare, Produs gresit
	
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

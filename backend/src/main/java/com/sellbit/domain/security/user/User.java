package com.sellbit.domain.security.user;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.sellbit.domain.lookup.userrole.UserRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Builder	
public class User {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Integer id;
	
	@Column(nullable = false, unique = true)
	private String username;
	
	
	@Column(name = "password_hash", nullable = false)
	private String passwordHash;
	
	@Column(name = "full_name")
	private String fullName;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "role_id", nullable = false)
	private UserRole role;
	
	@Builder.Default
	@Column(name = "language_code", length = 10)
	private String languageCode = "ro";
	
	@Builder.Default
	@Column(name = "is_active")
	private boolean isActive= true;
	
	@CreationTimestamp
	@Column(name = "created_at")
	private LocalDateTime createdAt;
	
	@Column(name = "deactivated_at")
	private LocalDateTime deactivatedAt;
}

package com.sellbit.domain.lookup.cancelreason;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CancelReasonRepository extends JpaRepository<CancelReason, Integer> {
	Optional<CancelReason> findByCode(String code);
	List<CancelReason> findAllByIsActiveTrue();
}

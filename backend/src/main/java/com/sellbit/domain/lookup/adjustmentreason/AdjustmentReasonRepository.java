package com.sellbit.domain.lookup.adjustmentreason;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AdjustmentReasonRepository extends JpaRepository<AdjustmentReason, Integer>{
	Optional<AdjustmentReason> findByCode(String code);
	List<AdjustmentReason> findAllByIsActiveTrue();
}

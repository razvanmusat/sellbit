package com.sellbit.domain.lookup.adjustmentreason;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AdjustmentReasonRepository extends JpaRepository<AdjustmentReason, Integer>{
	Optional<AdjustmentReason> findByCode(String code);
	List<AdjustmentReason> findAllByIsActiveTrue();
}

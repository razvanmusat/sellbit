package com.sellbit.domain.lookup.adjustmentreason;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdjustmentReasonService {

	private final AdjustmentReasonRepository repository;

	public List<AdjustmentReason> getAll() {
		return repository.findAll();
	}

	public List<AdjustmentReason> getAllActive() {
		return repository.findAllByIsActiveTrue();
	}

	@Transactional
	public AdjustmentReason save(AdjustmentReason reason) {
		if (reason.getId() != null && !repository.existsById(reason.getId())) {
            throw new EntityNotFoundException();
        }
		return repository.save(reason);
	}

	@Transactional
	public void deleteLogical(Integer id) {
		AdjustmentReason reason = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        reason.setActive(false);
        repository.save(reason);
	}
}

package com.sellbit.domain.lookup.cancelreason;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CancelReasonService {

	private final CancelReasonRepository repository;

	public List<CancelReason> getAll() {
		return repository.findAll();
	}

	public List<CancelReason> getAllActive() {
		return repository.findAllByIsActiveTrue();
	}

	@Transactional
	public CancelReason save(CancelReason reason) {
		if (reason.getId() != null && !repository.existsById(reason.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(reason);
	}

	@Transactional
	public void deleteLogical(Integer id) {
		CancelReason reason = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        reason.setActive(false);
        repository.save(reason);
	}
}

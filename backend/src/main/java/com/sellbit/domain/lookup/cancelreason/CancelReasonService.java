package com.sellbit.domain.lookup.cancelreason;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
		return repository.save(reason);
	}

	@Transactional
	public void deleteLogical(Integer id) {
		repository.findById(id).ifPresent(reason -> {
			reason.setActive(false);
			repository.save(reason);
		});
	}
}

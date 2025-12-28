package com.sellbit.domain.lookup.receiptstatus;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptStatusService {

    private final ReceiptStatusRepository repository;

    public List<ReceiptStatus> getAll() {
        return repository.findAll();
    }

    public List<ReceiptStatus> getAllActive() {
        return repository.findAllByIsActiveTrue();
    }

    @Transactional
    public ReceiptStatus save(ReceiptStatus status) {
    	if (status.getId() != null && !repository.existsById(status.getId())) {
            throw new EntityNotFoundException();
        }
        return repository.save(status);
    }

    @Transactional
    public void deleteLogical(Integer id) {
    	ReceiptStatus status = repository.findById(id)
                .orElseThrow(EntityNotFoundException::new);
        status.setActive(false);
        repository.save(status);
    }
}
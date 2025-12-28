package com.sellbit.domain.lookup.receiptstatus;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

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
        return repository.save(status);
    }

    @Transactional
    public void deleteLogical(Integer id) {
        repository.findById(id).ifPresent(status -> {
            status.setActive(false);
            repository.save(status);
        });
    }
}
package com.sellbit.domain.lookup.receiptstatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReceiptStatusRepository extends JpaRepository<ReceiptStatus, Integer> {
    Optional<ReceiptStatus> findByCode(String code);
    List<ReceiptStatus> findAllByIsActiveTrue();
}
package com.sellbit.domain.inventory.purchasefifoallocation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReceiptItemFifoAllocationRepository extends JpaRepository<ReceiptItemFifoAllocation, Integer> {

    List<ReceiptItemFifoAllocation> findByReceiptId(Integer receiptId);

    boolean existsByReceiptId(Integer receiptId);

    void deleteByReceiptId(Integer receiptId);

    boolean existsByPurchaseId(Integer purchaseId);
}

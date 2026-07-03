package com.sellbit.domain.inventory.purchasefifoallocation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReceiptItemFifoAllocationRepository extends JpaRepository<ReceiptItemFifoAllocation, Integer> {

    List<ReceiptItemFifoAllocation> findByReceiptId(Integer receiptId);

    boolean existsByReceiptId(Integer receiptId);

    void deleteByReceiptId(Integer receiptId);

    boolean existsByPurchaseId(Integer purchaseId);
}

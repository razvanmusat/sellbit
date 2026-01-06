package com.sellbit.domain.sales.receiptpayment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReceiptPaymentRepository extends JpaRepository<ReceiptPayment, Integer> {
    List<ReceiptPayment> findByReceiptId(Integer receiptId);
}
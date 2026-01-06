package com.sellbit.domain.sales.receiptpayment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReceiptPaymentDTO {
	public record Response(
	        Integer id,
	        Integer paymentMethodId,
	        String paymentMethodName,
	        String paymentMethodCode,
	        BigDecimal amount,
	        LocalDateTime paidAt
	    ) {}
}

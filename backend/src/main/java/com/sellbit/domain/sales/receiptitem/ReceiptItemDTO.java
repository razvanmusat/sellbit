package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;

public class ReceiptItemDTO {
	public record ReceiptItemResponse(
		    Integer id,
		    Integer productId,
		    String productName,
		    BigDecimal quantity,
		    BigDecimal unitPrice,
		    BigDecimal vatRate,
		    BigDecimal lineTotal,
		    BigDecimal netTotal,
		    BigDecimal vatTotal
		) {}
}

package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReceiptItemDTO {

        public record ReceiptItemResponse(
                        Integer id,
                        Integer productId,
                        String productName,
                        BigDecimal quantity,
                        BigDecimal remainingQuantity,
                        BigDecimal unitPrice,
                        BigDecimal vatRate,
                        BigDecimal lineTotal,
                        BigDecimal netTotal,
                        BigDecimal vatTotal,
                        Integer warehouseId,   // NOU — gestiunea liniei
                        String warehouseName   // NOU — afișat în UI per produs
        ) {
        }

        public record QuantityReportResponse(
                        String productName,
                        BigDecimal totalQuantity,
                        BigDecimal totalAmount) {
        }

        public record ProductTimelineResponse(
                        Integer id,
                        Integer receiptId,
                        LocalDateTime date,
                        String userName,
                        BigDecimal quantity,
                        BigDecimal price,
                        BigDecimal total) {
        }
}
package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class ReceiptDTOs {

    /**
     * Folosit pentru deschiderea unui bon nou (ex: deschiderea unei mese).
     */
    public record CreateRequest(
            @NotNull(message = "ERROR.WAREHOUSE.REQUIRED") Integer warehouseId,
            @NotBlank(message = "ERROR.TABLE_NAME.REQUIRED") String tableName,
            @NotNull(message = "ERROR.USER.REQUIRED") Integer userId,
            String note
    ) {
    }

    /**
     * Folosit pentru a trimite datele bonului către React.
     */
    public record Response(
            Integer id, 
            String statusLabel, 
            String tableName, 
            BigDecimal totalAmount,
            BigDecimal totalNet, 
            BigDecimal totalVat, 
            String warehouseName, 
            String userName, 
            LocalDateTime createdAt,
            LocalDateTime closedAt, 
            String note, 
            Integer originalReceiptId
    ) {
    }

    /**
     * DTO special pentru alertele de bonuri uitate deschise.
     */
    public record UnclosedAlert(
            Integer id, 
            String tableName, 
            LocalDateTime createdAt, 
            String warehouseName
    ) {
    }

    /**
     * DTO pentru stornări.
     */
    public record RefundRequest(
            @NotNull(message = "ERROR.USER.REQUIRED") Integer userId,
            @NotEmpty(message = "ERROR.ITEMS.REQUIRED") List<RefundItemRequest> items 
    ) {
    }

    public record RefundItemRequest(
            @NotNull(message = "ERROR.ITEM.REQUIRED") Integer receiptItemId,
            @NotNull(message = "ERROR.QUANTITY.REQUIRED") BigDecimal quantityToRefund
    ) {
    }
}
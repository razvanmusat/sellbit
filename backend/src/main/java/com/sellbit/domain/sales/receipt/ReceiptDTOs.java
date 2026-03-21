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
         * warehouseId eliminat — gestiunea se setează per linie, nu pe bon.
         */
        public record CreateRequest(
                        @NotBlank(message = "ERROR.TABLE_NAME.REQUIRED") String tableName,
                        @NotNull(message = "ERROR.USER.REQUIRED") Integer userId,
                        String note) {
        }

        /**
         * DTO pentru un produs de pe bon.
         * warehouseId și warehouseName adăugate — fiecare linie are gestiunea ei.
         */
        public record ItemResponse(
                        Integer receiptItemId,
                        Integer productId,
                        String name,
                        BigDecimal quantity,
                        BigDecimal price,
                        BigDecimal lineTotal,
                        Integer warehouseId,
                        String warehouseName) {
        }

        public record PaymentSummary(
                        String methodCode,
                        String methodLabel,
                        BigDecimal amount,
                        String additionalInfo,
                        Integer warehouseId,
                        String warehouseName) {
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
                        Integer warehouseId,
                        String userName,
                        LocalDateTime createdAt,
                        LocalDateTime closedAt,
                        String note,
                        String cancelReason,
                        Integer originalReceiptId,
                        List<ItemResponse> items,
                        List<PaymentSummary> payments) {
        }

        public record SummaryResponse(
                        Integer id,
                        String statusLabel,
                        String tableName,
                        BigDecimal totalAmount,
                        String warehouseName,
                        Integer warehouseId,
                        String userName,
                        LocalDateTime createdAt,
                        LocalDateTime closedAt,
                        Integer originalReceiptId) {
        }

        /**
         * DTO special pentru alertele de bonuri uitate deschise.
         */
        public record UnclosedAlert(
                        Integer id,
                        String tableName,
                        LocalDateTime createdAt,
                        String warehouseName) {
        }

        /**
         * DTO pentru stornări.
         */
        public record RefundRequest(
                        @NotNull(message = "ERROR.USER.REQUIRED") Integer userId,
                        @NotEmpty(message = "ERROR.ITEMS.REQUIRED") List<RefundItemRequest> items,
                        @NotNull(message = "ERROR.PAYMENT_METHOD.REQUIRED") Integer paymentMethodId,
                        String note) {
        }

        public record RefundItemRequest(
                        @NotNull(message = "ERROR.ITEM.REQUIRED") Integer receiptItemId,
                        @NotNull(message = "ERROR.QUANTITY.REQUIRED") BigDecimal quantityToRefund) {
        }

        // DTO pentru încasarea rapidă a unui avans.
        public record AdvancePaymentRequest(
                        @NotNull(message = "ERROR.WAREHOUSE.REQUIRED") Integer warehouseId,
                        @NotNull(message = "ERROR.AMOUNT.REQUIRED") BigDecimal amount,
                        @NotBlank(message = "ERROR.PAYMENT_METHOD.REQUIRED") String paymentMethodCode,
                        @NotNull(message = "ERROR.USER.REQUIRED") Integer userId,
                        String note) {
        }
}
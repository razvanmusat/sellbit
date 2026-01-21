package com.sellbit.domain.catering.cateringorder;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class CateringOrderDTOs {

    public record CreateOrderRequest(
        @NotNull(message = "ERROR.CATERING_ORDER.MENU_REQUIRED")
        Integer productId,

        Integer reservationId, // Nullable pentru bar

        @NotNull(message = "ERROR.CATERING_ORDER.QUANTITY_REQUIRED")
        @Min(value = 1, message = "ERROR.CATERING_ORDER.MIN_QUANTITY_1")
        Integer quantity,

        @NotNull(message = "ERROR.CATERING_ORDER.DATE_REQUIRED")
        LocalDate orderDate
    ) {}

    public record OrderResponse(
        Integer id,
        Integer productId,
        String productName,
        Integer reservationId,
        Integer quantity,
        LocalDate orderDate,
        Boolean isPaid,
        LocalDateTime paidAt,
        LocalDateTime createdAt
    ) {}

    public record BulkPayRequest(
        @NotEmpty(message = "ERROR.CATERING_ORDER.NO_ORDERS_SELECTED")
        List<Integer> orderIds
    ) {}
}
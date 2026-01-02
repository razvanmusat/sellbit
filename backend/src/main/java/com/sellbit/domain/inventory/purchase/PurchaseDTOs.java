package com.sellbit.domain.inventory.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public class PurchaseDTOs {

	/**
	 * Element individual dintr-o recepție de marfă (un rând din tabelul din React).
	 */
	public record CreateItem(@NotNull(message = "ERROR.PRODUCT.REQUIRED") Integer productId,

			@NotNull(message = "ERROR.WAREHOUSE.REQUIRED") Integer warehouseId,

			@NotNull(message = "ERROR.QUANTITY.REQUIRED") @DecimalMin(value = "0.001", message = "ERROR.QUANTITY.MIN_VALUE") BigDecimal quantity,

			@NotNull(message = "ERROR.PRICE.REQUIRED") @DecimalMin(value = "0.00", message = "ERROR.PRICE.MIN_VALUE") BigDecimal purchasePrice,

			LocalDate expirationDate,

			String note) {
	}

	public record BulkCreate(@NotNull(message = "ERROR.USER.REQUIRED") Integer userId,

			@NotEmpty(message = "ERROR.LIST.EMPTY") @Valid // Obligatoriu pentru a valida fiecare obiect din listă
			List<CreateItem> items) {
	}

	/**
	 * Pentru afișarea în istoricul achizițiilor/rapoarte.
	 */
	public record Response(Integer id, String productName, String warehouseName, BigDecimal quantity,
			BigDecimal remainingQuantity, BigDecimal purchasePrice, LocalDateTime purchasedAt, LocalDate expirationDate,
			String note) {
	}

	public record ExpirationAlert(Integer purchaseId, String productName, String warehouseName,
			BigDecimal remainingQuantity, LocalDate expirationDate, long daysUntilExpiration) {
	}
}
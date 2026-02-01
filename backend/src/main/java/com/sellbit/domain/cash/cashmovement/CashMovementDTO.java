package com.sellbit.domain.cash.cashmovement;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CashMovementDTO(
    Integer id,
    LocalDateTime createdAt,
    BigDecimal amount,
    String note,
    String typeCode,
    String typeLabel,
    String userName
) {}
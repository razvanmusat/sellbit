package com.sellbit.domain.config;

import lombok.Getter;
import java.util.List;

@Getter
public class InsufficientStockException extends RuntimeException {
    
    private static final long serialVersionUID = 1L;

    private final List<String> productNames;

    public InsufficientStockException(List<String> productNames) {
        super("ERROR.STOCK.INSUFFICIENT_QUANTITY");
        this.productNames = productNames;
    }
}
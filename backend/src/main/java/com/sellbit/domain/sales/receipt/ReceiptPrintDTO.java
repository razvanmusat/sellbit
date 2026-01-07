package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Nota de Plata
 */
public record ReceiptPrintDTO(
	    String storeName,
	    String storeAddress,
	    String storePhone,        
	    List<BillNoteItemDTO> items,
	    String voucherCode,
	    String voucherCampaignName,
	    BigDecimal subtotal,       // Suma produselor (ex: 25.00)	    
	    BigDecimal voucherValue,    // Valoarea reducerii (ex: 10.00)
	    BigDecimal totalToPay,      // Ce a rămas/plătit efectiv (ex: 15.00)
	    LocalDateTime createdAt
	) {}

/**
 * Item-ul simplu pentru nota de plata.
 * Este in acelasi fisier, deci vizibil in pachet fara prefix.
 */
record BillNoteItemDTO(
    String productName,
    BigDecimal quantity,
    BigDecimal unitPrice
) {}

/**
 * Structura pentru Bon Fiscal (Viitor).
 */
record FiscalReceiptDTO(
    String storeName,
    String storeAddress,
    String storeCui,
    String storeRegCom,
    String storePhone,
    Integer receiptId,        
    List<FiscalItemDTO> items,
    BigDecimal totalNet,
    BigDecimal totalVat,
    BigDecimal totalAmount,
    String voucherCode,
    LocalDateTime createdAt
) {}

record FiscalItemDTO(
    String productName,
    BigDecimal quantity,
    BigDecimal unitPriceNet,
    BigDecimal vatRate,
    BigDecimal vatValue,
    BigDecimal lineTotal
) {}
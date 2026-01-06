package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.sellbit.domain.sales.receipt.ReceiptDTOs;
import com.sellbit.domain.sales.receiptitem.ReceiptItemDTO.ReceiptItemResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sales/receipt-items")
@RequiredArgsConstructor
public class ReceiptItemController {

    private final ReceiptItemService receiptItemService;
    
    /**
     * POST /api/sales/receipt-items/sync
     * Returnează ReceiptDTOs.Response (Header actualizat).
     */
    @PostMapping("/sync")
    public ResponseEntity<ReceiptDTOs.Response> addOrUpdateItem(
            @RequestParam Integer receiptId,
            @RequestParam Integer productId,
            @RequestParam BigDecimal quantity) {
        
        return ResponseEntity.ok(receiptItemService.addOrUpdateItem(receiptId, productId, quantity));
    }

    /**
     * DELETE /api/sales/receipt-items/{itemId}
     * Returnează ReceiptDTOs.Response (Header actualizat).
     */
    @DeleteMapping("/{itemId}")
    public ResponseEntity<ReceiptDTOs.Response> removeItem(@PathVariable Integer itemId) {
        return ResponseEntity.ok(receiptItemService.removeItem(itemId));
    }

    /**
     * GET /api/sales/receipt-items/receipt/{receiptId}
     * Returnează liniile brute pentru tabelul din React.
     */
    @GetMapping("/receipt/{receiptId}")
    public ResponseEntity<List<ReceiptItemResponse>> getItemsByReceipt(@PathVariable Integer receiptId) {
        return ResponseEntity.ok(receiptItemService.getItemsByReceipt(receiptId));
    }
}
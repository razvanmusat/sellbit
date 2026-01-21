package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/sync") // Adaugă sau actualizează un produs pe bon.
    public ResponseEntity<ReceiptDTOs.Response> addOrUpdateItem(
            @RequestParam Integer receiptId,
            @RequestParam Integer productId,
            @RequestParam BigDecimal quantity) {

        return ResponseEntity.ok(receiptItemService.addOrUpdateItem(receiptId, productId, quantity));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @DeleteMapping("/{itemId}") // Șterge o linie de pe bon.
    public ResponseEntity<ReceiptDTOs.Response> removeItem(@PathVariable Integer itemId) {
        return ResponseEntity.ok(receiptItemService.removeItem(itemId));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/receipt/{receiptId}") // Obține toate liniile de bon pentru un anumit bon.
    public ResponseEntity<List<ReceiptItemResponse>> getItemsByReceipt(@PathVariable Integer receiptId) {
        return ResponseEntity.ok(receiptItemService.getItemsByReceipt(receiptId));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report/quantity") // Raport cantitativ produse vândute într-un interval de timp.
    public ResponseEntity<List<ReceiptItemDTO.QuantityReportResponse>> getProductsQuantityReport(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime end,
            @RequestParam(required = false) List<Integer> productIds) {

        return ResponseEntity.ok(receiptItemService.getProductsQuantityReport(start, end, productIds));
    }
}
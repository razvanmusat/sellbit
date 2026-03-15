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
    @PostMapping("/sync") // Adaugă sau actualizează un produs pe bon — gestiunea se trimite per linie.
    public ResponseEntity<ReceiptDTOs.Response> addOrUpdateItem(
            @RequestParam Integer receiptId,
            @RequestParam Integer productId,
            @RequestParam BigDecimal quantity,
            @RequestParam Integer warehouseId) { // NOU — gestiunea liniei, selectată din UI

        return ResponseEntity.ok(receiptItemService.addOrUpdateItem(receiptId, productId, quantity, warehouseId));
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
    @GetMapping("/report/quantity") // Raport cantitativ produse (filtru opțional pe gestiune)
    public ResponseEntity<List<ReceiptItemDTO.QuantityReportResponse>> getProductsQuantityReport(
            @RequestParam(required = false) Integer warehouseId,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime end,
            @RequestParam(required = false) List<Integer> productIds) {

        return ResponseEntity.ok(receiptItemService.getProductsQuantityReport(start, end, productIds, warehouseId));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report/timeline") // Timeline detaliat pentru un produs selectat
    public ResponseEntity<List<ReceiptItemDTO.ProductTimelineResponse>> getProductTimeline(
            @RequestParam(required = false) Integer warehouseId,
            @RequestParam Integer productId,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime start,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime end) {

        return ResponseEntity.ok(receiptItemService.getProductTimeline(start, end, productId, warehouseId));
    }
}
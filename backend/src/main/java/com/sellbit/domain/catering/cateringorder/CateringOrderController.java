package com.sellbit.domain.catering.cateringorder;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/catering/catering-orders")
@RequiredArgsConstructor
public class CateringOrderController {

    private final CateringOrderService orderService;

    // --- OPERAȚIUNI STAFF (OPERATIONAL) ---

    @PostMapping
    public ResponseEntity<CateringOrderDTOs.OrderResponse> create(@Valid @RequestBody CateringOrderDTOs.CreateOrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CateringOrderDTOs.OrderResponse> update(
            @PathVariable Integer id, 
            @Valid @RequestBody CateringOrderDTOs.CreateOrderRequest request) {
        return ResponseEntity.ok(orderService.updateOrder(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/daily")
    public ResponseEntity<List<CateringOrderDTOs.OrderResponse>> getDailyOrders(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(orderService.getDailyOrders(date));
    }

    // --- OPERAȚIUNI ADMIN (FINANCIAR) ---

    @GetMapping("/unpaid")
    public ResponseEntity<List<CateringOrderDTOs.OrderResponse>> getUnpaid(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(orderService.getUnpaidOrders(start, end));
    }

    @PatchMapping("/bulk-pay")
    public ResponseEntity<Void> bulkPay(@Valid @RequestBody CateringOrderDTOs.BulkPayRequest request) {
        orderService.processBulkPayment(request);
        return ResponseEntity.ok().build();
    }
}
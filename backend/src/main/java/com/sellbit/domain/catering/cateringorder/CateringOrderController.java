package com.sellbit.domain.catering.cateringorder;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.sellbit.domain.catalog.product.ProductDTO;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/catering/catering-orders")
@RequiredArgsConstructor
public class CateringOrderController {

    private final CateringOrderService orderService;

    // --- OPERAȚIUNI STAFF (OPERATIONAL) ---

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping //Casierul introduce o comandă nouă de catering
    public ResponseEntity<List<CateringOrderDTOs.OrderResponse>> create(
            @Valid @RequestBody List<CateringOrderDTOs.CreateOrderRequest> request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')") 
    @GetMapping("/available-products") //Returnează lista de produse de tip CATERING active. 
    public ResponseEntity<List<ProductDTO>> getAvailableProducts() {
        //Casierul are nevoie de asta pentru a popula dropdown-ul de selecție.
        return ResponseEntity.ok(orderService.getAvailableCateringProducts());
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PutMapping("/{id}") //Permite modificarea cantității sau produsului (doar pentru comenzi viitoare/azi). Util dacă s-a greșit introducerea comenzii.
    public ResponseEntity<CateringOrderDTOs.OrderResponse> update(
            @PathVariable Integer id,
            @Valid @RequestBody CateringOrderDTOs.CreateOrderRequest request) {
        return ResponseEntity.ok(orderService.updateOrder(id, request));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @DeleteMapping("/{id}") //Anulează o comandă greșită. poate șterge doar comenzi viitoare (Service-ul blochează ștergerea istoricului).
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/daily") //Ce avem de livrat azi. 
    public ResponseEntity<List<CateringOrderDTOs.OrderResponse>> getDailyOrders(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(orderService.getDailyOrders(date));
    }

    // --- OPERAȚIUNI ADMIN (FINANCIAR) ---

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/unpaid") //Folosit pentru a genera facturi la final de lună sau pentru a urmări datoriile.
    public ResponseEntity<List<CateringOrderDTOs.OrderResponse>> getUnpaid(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(orderService.getUnpaidOrders(start, end));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PatchMapping("/bulk-pay")//Marchează un set de comenzi ca plătite într-un singur pas.
    public ResponseEntity<Void> bulkPay(@Valid @RequestBody CateringOrderDTOs.BulkPayRequest request) {
        orderService.processBulkPayment(request);
        return ResponseEntity.ok().build();
    }
}
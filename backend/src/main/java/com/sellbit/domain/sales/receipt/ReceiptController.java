package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/sales/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping // POS: Deschide o masă nouă (sau un bon nou).
    public ResponseEntity<ReceiptDTOs.Response> create(@RequestBody @Valid ReceiptDTOs.CreateRequest request) {
        return ResponseEntity.ok(receiptService.createReceipt(request));
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/reports/profit") // RAPORTARE: Obține profitul net într-un interval de timp.
    public ResponseEntity<BigDecimal> getProfit(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getGrossProfitReport(start, end));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active") // POS: Obține bonurile deschise pentru o gestiune.
    public ResponseEntity<List<ReceiptDTOs.Response>> getActive(@RequestParam Integer warehouseId) {
        return ResponseEntity.ok(receiptService.getActiveReceipts(warehouseId));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/report") //RAPORT: Bonurile într-un interval de timp, filtrat după gestiune si stare
    public ResponseEntity<List<ReceiptDTOs.Response>> getReport(
            @RequestParam Integer warehouseId,
            @RequestParam String status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getReceiptsReport(warehouseId, status, start, end));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/alerts") // ALERTE: Bonuri uitate deschise de ieri.
    public ResponseEntity<List<ReceiptDTOs.UnclosedAlert>> getAlerts() {
        return ResponseEntity.ok(receiptService.getUnclosedAlerts());
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PatchMapping("/{id}/cancel") // POS: Anulează bonul deschis si returneaza stocurile. Cere motiv.
    public ResponseEntity<Void> cancel(@PathVariable Integer id, @RequestParam Integer reasonId) {
        receiptService.cancelOpenReceipt(id, reasonId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/{id}/close") // POS: Închidere Bon (Plată).
    public ResponseEntity<Void> close(@PathVariable Integer id) {
        receiptService.closeReceipt(id);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/{id}/refund") // POS: Refundare parțială a unui bon.
    public ResponseEntity<ReceiptDTOs.Response> refund(@PathVariable Integer id,
            @RequestBody @Valid ReceiptDTOs.RefundRequest request) {
        return ResponseEntity.ok(receiptService.createPartialRefund(id, request));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/{id}/print-bill-note") // POS: Printare Nota de plată.
    public ResponseEntity<ReceiptPrintDTO> getBillNoteForPrint(@PathVariable Integer id) {
        return ResponseEntity.ok(receiptService.getBillNoteData(id));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/advance") // POS: Incasare Avans direct în gestiune.
    public ResponseEntity<Void> registerAdvance(@RequestBody @Valid ReceiptDTOs.AdvancePaymentRequest request) {

        receiptService.registerAdvancePayment(
                request.warehouseId(),
                request.amount(),
                request.paymentMethodCode(),
                request.userId(),
                request.note());

        return ResponseEntity.ok().build();
    }
}
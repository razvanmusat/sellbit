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
import com.sellbit.domain.sales.fiscal.ReceiptFiscalService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/sales/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;
    private final ReceiptFiscalService receiptFiscalService;

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/{id}")
    public ResponseEntity<ReceiptDTOs.Response> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(receiptService.getReceiptById(id));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping
    public ResponseEntity<ReceiptDTOs.Response> create(@RequestBody @Valid ReceiptDTOs.CreateRequest request) {
        return ResponseEntity.ok(receiptService.createReceipt(request));
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/reports/profit")
    public ResponseEntity<BigDecimal> getProfit(
            @RequestParam(required = false) Integer warehouseId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getGrossProfitReport(start, end, warehouseId));
    }

    // POS: Toate bonurile deschise — fără filtru pe gestiune.
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/active")
    public ResponseEntity<List<ReceiptDTOs.Response>> getActive() {
        return ResponseEntity.ok(receiptService.getActiveReceipts());
    }

    // RAPORT: Bonurile unui interval, filtrate după gestiunea liniilor.
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/report")
    public ResponseEntity<List<ReceiptDTOs.Response>> getReport(
            @RequestParam(required = false) Integer warehouseId,
            @RequestParam String status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getReceiptsReport(warehouseId, status, start, end));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/report/summary")
    public ResponseEntity<List<ReceiptDTOs.SummaryResponse>> getReportSummary(
            @RequestParam(required = false) Integer warehouseId,
            @RequestParam String status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(receiptService.getReceiptsReportSummary(warehouseId, status, start, end));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/alerts")
    public ResponseEntity<List<ReceiptDTOs.UnclosedAlert>> getAlerts() {
        return ResponseEntity.ok(receiptService.getUnclosedAlerts());
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable Integer id, @RequestParam Integer reasonId) {
        receiptService.cancelOpenReceipt(id, reasonId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/{id}/close")
    public ResponseEntity<com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs.VoucherIssuanceResult> close(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "false") boolean skipFiscal) {
        if (skipFiscal) {
            return ResponseEntity.ok(receiptService.closeReceipt(id));
        }
        return ResponseEntity.ok(receiptFiscalService.closeFiscal(id));
    }

    // Verificare pasiva pentru bon FISCAL_PENDING, fara POST nou catre Fisco.
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/{id}/fiscal/check")
    public ResponseEntity<Boolean> checkFiscalPending(@PathVariable Integer id) {
        return ResponseEntity.ok(receiptFiscalService.checkAndCloseIfPrinted(id));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/{id}/refund")
    public ResponseEntity<ReceiptDTOs.Response> refund(@PathVariable Integer id,
            @RequestBody @Valid ReceiptDTOs.RefundRequest request) {
        return ResponseEntity.ok(receiptService.createPartialRefund(id, request));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/{id}/print-bill-note")
    public ResponseEntity<ReceiptPrintDTO> getBillNoteForPrint(@PathVariable Integer id) {
        return ResponseEntity.ok(receiptService.getBillNoteData(id));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/advance")
    public ResponseEntity<Void> registerAdvance(
            @RequestBody @Valid ReceiptDTOs.AdvancePaymentRequest request,
            @RequestParam(defaultValue = "false") boolean skipFiscal) {
        if (skipFiscal) {
            receiptService.registerAdvancePayment(
                    request.warehouseId(),
                    request.amount(),
                    request.paymentMethodCode(),
                    request.userId(),
                    request.note());
        } else {
            receiptFiscalService.registerAdvanceFiscal(
                    request.warehouseId(),
                    request.amount(),
                    request.paymentMethodCode(),
                    request.userId(),
                    request.note());
        }
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/gift-card")
    public ResponseEntity<com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs.IssuedVoucherInfo> registerGiftCard(
            @RequestBody @Valid ReceiptDTOs.GiftCardRequest request,
            @RequestParam(defaultValue = "false") boolean skipFiscal) {
        if (skipFiscal) {
            return ResponseEntity.ok(receiptService.registerGiftCardPayment(
                    request.warehouseId(),
                    request.amount(),
                    request.paymentMethodCode(),
                    request.userId(),
                    request.note()));
        }
        return ResponseEntity.ok(receiptFiscalService.registerGiftCardFiscal(
                request.warehouseId(),
                request.amount(),
                request.paymentMethodCode(),
                request.userId(),
                request.note()));
    }

    @PreAuthorize("hasAuthority('100')")
    @PostMapping("/{id}/edit")
    public ResponseEntity<ReceiptDTOs.Response> editReceipt(
            @PathVariable Integer id,
            @RequestBody @Valid ReceiptDTOs.EditReceiptRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(receiptService.editReceipt(id, request, auth.getName()));
    }
}

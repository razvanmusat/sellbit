package com.sellbit.domain.voucher.customervoucher;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/voucher/customer-vouchers")
@RequiredArgsConstructor
public class CustomerVoucherController {

    private final CustomerVoucherService customerVoucherService;

    /**
     * Validează un cod pentru POS (interfața de vânzare).
     */
    @GetMapping("/validate/{code}")
    public ResponseEntity<CustomerVoucherDTOs.ValidationResponse> validate(@PathVariable String code) {
        return ResponseEntity.ok(customerVoucherService.validateCode(code));
    }

    /**
     * Consumă un voucher manual (dacă nu e integrat automat în fluxul de plată).
     */
    @PostMapping("/consume")
    public ResponseEntity<Void> consume(@RequestBody CustomerVoucherDTOs.ConsumeRequest request) {
        // În fluxul de vânzare real, se va trece un Receipt obiect, aici trimitem null pentru consum manual
        customerVoucherService.consumeVoucher(request.code(), null);
        return ResponseEntity.ok().build();
    }

    /**
     * Listarea tuturor voucherelor emise (pentru raportare/istoric).
     */
    @GetMapping
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getAllVouchers() {
        return ResponseEntity.ok(customerVoucherService.getAllVouchers());
    }

    /**
     * Vizualizarea voucherelor folosite.
     */
    @GetMapping("/used")
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getUsedVouchers() {
        return ResponseEntity.ok(customerVoucherService.getUsedVouchers());
    }

    /**
     * Vizualizarea voucherelor încă valabile (nefolosite și neexpirate).
     */
    @GetMapping("/available")
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getAvailableVouchers() {
        return ResponseEntity.ok(customerVoucherService.getAvailableVouchers());
    }
    
    @PostMapping("/reactivate/{code}")
    public ResponseEntity<Void> reactivateVoucher(@PathVariable String code) {
    	customerVoucherService.reactivateVoucherByCode(code);
        return ResponseEntity.ok().build();
    }
}
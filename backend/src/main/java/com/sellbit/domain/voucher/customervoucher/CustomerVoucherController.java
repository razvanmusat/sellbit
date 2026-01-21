package com.sellbit.domain.voucher.customervoucher;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/voucher/customer-vouchers")
@RequiredArgsConstructor
public class CustomerVoucherController {

    private final CustomerVoucherService customerVoucherService;
    
    // Validează un cod pentru POS (interfața de vânzare).
    // MOTIV: Casierul trebuie să scaneze codul la casa de marcat pentru a vedea dacă e valid și ce reducere oferă
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/validate/{code}")
    public ResponseEntity<CustomerVoucherDTOs.ValidationResponse> validate(@PathVariable String code) {
        return ResponseEntity.ok(customerVoucherService.validateCode(code));
    }

    /* Consumă un voucher manual.
     * MOTIV: Dacă integrarea automată eșuează sau voucherul e pe hârtie și nu se leagă de un bon digital,
     * casierul trebuie să poată invalida voucherul manual ca să nu mai fie folosit a doua oară. */     
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @PostMapping("/consume")
    public ResponseEntity<Void> consume(@RequestBody CustomerVoucherDTOs.ConsumeRequest request) {
        customerVoucherService.consumeVoucher(request.code(), null);
        return ResponseEntity.ok().build();
    }

    //Listarea tuturor voucherelor emise (Istoric complet).
    @PreAuthorize("hasAuthority('100')")
    @GetMapping
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getAllVouchers() {
        return ResponseEntity.ok(customerVoucherService.getAllVouchers());
    }

    // Listarea tuturor voucherelor deja consumate.
    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/used")
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getUsedVouchers() {
        return ResponseEntity.ok(customerVoucherService.getUsedVouchers());
    }

    // Listarea tuturor voucherelor încă disponibile (neutilizate).
    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/available")
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getAvailableVouchers() {
        return ResponseEntity.ok(customerVoucherService.getAvailableVouchers());
    }
    
    // Reactivarea unui voucher (undo la consumare).
    @PreAuthorize("hasAuthority('100')")
    @PostMapping("/reactivate/{code}")
    public ResponseEntity<Void> reactivateVoucher(@PathVariable String code) {
    	customerVoucherService.reactivateVoucherByCode(code);
        return ResponseEntity.ok().build();
    }
}
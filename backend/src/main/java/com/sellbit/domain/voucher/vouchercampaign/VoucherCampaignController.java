package com.sellbit.domain.voucher.vouchercampaign;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/voucher/voucher-campaigns")
@RequiredArgsConstructor
public class VoucherCampaignController {

    private final VoucherCampaignService campaignService;
    private final CustomerVoucherService voucherService;

    @PreAuthorize("hasAuthority('100')")
    @PostMapping
    public ResponseEntity<VoucherCampaignDTOs.Response> create(@Valid @RequestBody VoucherCampaignDTOs.Request request) {
        return ResponseEntity.ok(campaignService.create(request));
    }

    @PreAuthorize("hasAuthority('100')")
    @PutMapping("/{id}")
    public ResponseEntity<VoucherCampaignDTOs.Response> update(
            @PathVariable Integer id,
            @Valid @RequestBody VoucherCampaignDTOs.Request request
    ) {
        return ResponseEntity.ok(campaignService.update(id, request));
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getAll() {
        return ResponseEntity.ok(campaignService.getAll());
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/active")
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getActive() {
        return ResponseEntity.ok(campaignService.getActiveCampaigns());
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/inactive")
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getInactive() {
        return ResponseEntity.ok(campaignService.getInactiveCampaigns());
    }

    @PreAuthorize("hasAuthority('100')")
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<VoucherCampaignDTOs.Response> toggle(@PathVariable Integer id) {
        return ResponseEntity.ok(campaignService.toggleStatus(id));
    }

    @PreAuthorize("hasAnyAuthority('50','100')")
    @GetMapping("/active-prefixes")
    public ResponseEntity<List<String>> getActivePrefixes() {
        return ResponseEntity.ok(campaignService.getActivePrefixes(LocalDate.now()));
    }

    // Verifică dacă există o campanie GIFT_CARD activă (pentru butonul din sell page)
    @PreAuthorize("hasAnyAuthority('50','100')")
    @GetMapping("/gift-card-status")
    public ResponseEntity<VoucherCampaignDTOs.ActiveGiftCardResponse> getGiftCardStatus() {
        return ResponseEntity.ok(campaignService.getActiveGiftCardStatus());
    }

    // Emite un voucher LOYALTY după alegerea casierului din dialog
    @PreAuthorize("hasAnyAuthority('50','100')")
    @PostMapping("/{campaignId}/issue-loyalty")
    public ResponseEntity<CustomerVoucherDTOs.IssuedVoucherInfo> issueLoyalty(
            @PathVariable Integer campaignId,
            @RequestParam Integer receiptId) {
        return ResponseEntity.ok(voucherService.issueLoyaltyVoucher(campaignId, receiptId));
    }

    // Înregistrează o ștampilă (fără voucher)
    @PreAuthorize("hasAnyAuthority('50','100')")
    @PostMapping("/{campaignId}/stamp")
    public ResponseEntity<Void> addStamp(
            @PathVariable Integer campaignId,
            @RequestParam(required = false) Integer cashierId,
            @RequestParam(required = false) Integer receiptId) {
        voucherService.addStamp(campaignId, cashierId, receiptId);
        return ResponseEntity.ok().build();
    }

    // Statistici fidelitate pentru tab admin (frauda detection)
    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/{campaignId}/loyalty-stats")
    public ResponseEntity<CustomerVoucherDTOs.LoyaltyStats> getLoyaltyStats(
            @PathVariable Integer campaignId) {
        return ResponseEntity.ok(voucherService.getLoyaltyStats(campaignId));
    }

    // Voucherele emise de un bon (pentru reprint)
    @PreAuthorize("hasAnyAuthority('50','100')")
    @GetMapping("/issued-by-receipt/{receiptId}")
    public ResponseEntity<List<CustomerVoucherDTOs.SummaryResponse>> getIssuedByReceipt(
            @PathVariable Integer receiptId) {
        return ResponseEntity.ok(voucherService.getVouchersByIssuedReceipt(receiptId));
    }
}

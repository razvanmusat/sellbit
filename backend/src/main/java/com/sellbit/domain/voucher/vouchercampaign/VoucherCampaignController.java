package com.sellbit.domain.voucher.vouchercampaign;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/voucher/voucher-campaigns")
@RequiredArgsConstructor
public class VoucherCampaignController {

    private final VoucherCampaignService campaignService;

    @PreAuthorize("hasAuthority('100')")
    @PostMapping // Crearea unei noi campanii de vouchere.
    public ResponseEntity<VoucherCampaignDTOs.Response> create(@Valid @RequestBody VoucherCampaignDTOs.Request request) {
        return ResponseEntity.ok(campaignService.create(request));
    }

    @PreAuthorize("hasAuthority('100')")
    @PutMapping("/{id}") // Editarea unei campanii de vouchere.
    public ResponseEntity<VoucherCampaignDTOs.Response> update(
            @PathVariable Integer id,
            @Valid @RequestBody VoucherCampaignDTOs.Request request
    ) {
        return ResponseEntity.ok(campaignService.update(id, request));
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping // Listarea tuturor campaniilor de vouchere (istoric complet).
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getAll() {
        return ResponseEntity.ok(campaignService.getAll());
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/active") // Listarea campaniilor de vouchere active.
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getActive() {
        return ResponseEntity.ok(campaignService.getActiveCampaigns());
    }

    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/inactive") // Listarea campaniilor de vouchere inactive.
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getInactive() {
        return ResponseEntity.ok(campaignService.getInactiveCampaigns());
    }

    @PreAuthorize("hasAuthority('100')")
    @PatchMapping("/{id}/toggle") // Activarea/dezactivarea unei campanii de vouchere.
    public ResponseEntity<VoucherCampaignDTOs.Response> toggle(@PathVariable Integer id) {
        return ResponseEntity.ok(campaignService.toggleStatus(id));
    }
    
    //Verifică ce prefixe sunt deja folosite (ex: JOACA-, VARA-).
    //Helper pentru formularul de creare campanie (să nu duplicăm prefixele).
    @PreAuthorize("hasAuthority('100')")
    @GetMapping("/active-prefixes")
    public ResponseEntity<List<String>> getActivePrefixes() {
        return ResponseEntity.ok(campaignService.getActivePrefixes(LocalDate.now()));
    }
}
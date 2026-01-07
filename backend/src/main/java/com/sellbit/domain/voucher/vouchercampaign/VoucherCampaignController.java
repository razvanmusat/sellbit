package com.sellbit.domain.voucher.vouchercampaign;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/voucher/voucher-campaigns")
@RequiredArgsConstructor
public class VoucherCampaignController {

    private final VoucherCampaignService campaignService;

    @PostMapping
    public ResponseEntity<VoucherCampaignDTOs.Response> create(@RequestBody VoucherCampaignDTOs.Request request) {
        return ResponseEntity.ok(campaignService.create(request));
    }

    @GetMapping
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getAll() {
        return ResponseEntity.ok(campaignService.getAll());
    }

    @GetMapping("/active")
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getActive() {
        return ResponseEntity.ok(campaignService.getActiveCampaigns());
    }

    @GetMapping("/inactive")
    public ResponseEntity<List<VoucherCampaignDTOs.Response>> getInactive() {
        return ResponseEntity.ok(campaignService.getInactiveCampaigns());
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<VoucherCampaignDTOs.Response> toggle(@PathVariable Integer id) {
        return ResponseEntity.ok(campaignService.toggleStatus(id));
    }
    
    @GetMapping("/active-prefixes")
    public ResponseEntity<List<String>> getActivePrefixes() {
        return ResponseEntity.ok(campaignService.getActivePrefixes(LocalDate.now()));
    }
}
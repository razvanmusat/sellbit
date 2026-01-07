package com.sellbit.domain.voucher.vouchercampaign;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VoucherCampaignController.class)
@AutoConfigureMockMvc(addFilters = false) // Ignorăm securitatea
class VoucherCampaignControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockitoBean private VoucherCampaignService service;

    // --- create ---
    @Test @DisplayName("POST /api/voucher/voucher-campaigns - Succes")
    void create_Endpoint() throws Exception {
        when(service.create(any())).thenReturn(null); // Returnul poate fi null pentru test status
        
        mockMvc.perform(post("/api/voucher/voucher-campaigns")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Test\"}"))
                .andExpect(status().isOk());
    }

    // --- getAll ---
    @Test @DisplayName("GET /api/voucher/voucher-campaigns - Valid")
    void getAll_Endpoint() throws Exception {
        when(service.getAll()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/voucher-campaigns"))
                .andExpect(status().isOk());
    }

    // --- getActive ---
    @Test @DisplayName("GET /api/voucher/voucher-campaigns/active - Valid")
    void getActive_Endpoint() throws Exception {
        when(service.getActiveCampaigns()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/voucher-campaigns/active"))
                .andExpect(status().isOk());
    }

    // --- getInactive ---
    @Test @DisplayName("GET /api/voucher/voucher-campaigns/inactive - Valid")
    void getInactive_Endpoint() throws Exception {
        when(service.getInactiveCampaigns()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/voucher-campaigns/inactive"))
                .andExpect(status().isOk());
    }

    // --- toggle ---
    @Test @DisplayName("PATCH /api/voucher/voucher-campaigns/{id}/toggle - Succes")
    void toggle_Endpoint() throws Exception {
        when(service.toggleStatus(1)).thenReturn(null);
        mockMvc.perform(patch("/api/voucher/voucher-campaigns/1/toggle"))
                .andExpect(status().isOk());
    }
}
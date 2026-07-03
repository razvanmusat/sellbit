package com.sellbit.domain.voucher.vouchercampaign;

import com.sellbit.domain.security.auth.JwtUtils;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VoucherCampaignController.class)
@AutoConfigureMockMvc(addFilters = false) // Ignorăm securitatea (filtrele) pentru testare unitară
class VoucherCampaignControllerTest {

    @Autowired 
    private MockMvc mockMvc;

    @MockitoBean 
    private VoucherCampaignService service;

    // Mock-uri obligatorii pentru satisfacerea dependințelor JwtAuthenticationFilter
    @MockitoBean 
    private JwtUtils jwtUtils;

    @MockitoBean 
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private CustomerVoucherService customerVoucherService;

    // --- create ---
    @Test 
    @DisplayName("POST /api/voucher/voucher-campaigns - Succes")
    void create_Endpoint() throws Exception {
        when(service.create(any())).thenReturn(null);
        
        mockMvc.perform(post("/api/voucher/voucher-campaigns")
                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                                {
                                                    "name": "Test",
                                                    "validFromDate": "2026-02-01",
                                                    "validUntilDate": "2026-03-01",
                                                    "discountType": "FIXED",
                                                    "discountValue": 10.00,
                                                    "maxDiscountAmount": 50.00,
                                                    "minAmount": 50.00,
                                                    "validDays": 30,
                                                    "campaignType": "REGULAR"
                                                }
                                                """))
                .andExpect(status().isOk());
    }

            @Test
            @DisplayName("POST /api/voucher/voucher-campaigns - Payload invalid => 400")
            void create_Endpoint_InvalidPayload_ReturnsBadRequest() throws Exception {
            mockMvc.perform(post("/api/voucher/voucher-campaigns")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                                            "name": "Test",
                                            "validUntilDate": "2026-03-01",
                                            "discountType": "FIXED",
                                            "discountValue": 10.00,
                                            "maxDiscountAmount": 50.00,
                                            "minAmount": 50.00,
                                            "validDays": 30,
                                            "campaignType": "REGULAR"
                    }
                    """))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("ERROR.VOUCHER_CAMPAIGN.START_DATE_REQUIRED"));
            }

                    @Test
                    @DisplayName("PUT /api/voucher/voucher-campaigns/{id} - Payload invalid => 400")
                    void update_Endpoint_InvalidPayload_ReturnsBadRequest() throws Exception {
                    mockMvc.perform(put("/api/voucher/voucher-campaigns/1")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                                            "name": "Test",
                                            "validFromDate": "2026-02-01",
                                            "validUntilDate": "2026-03-01",
                                            "discountType": "FIXED",
                                            "discountValue": 10.00,
                                            "maxDiscountAmount": 50.00,
                                            "minAmount": 50.00,
                                            "validDays": 30,
                                            "campaignType": "REGULAR"
                        }
                        """))
                        .andExpect(status().isOk());
                    }

    // --- getAll ---
    @Test 
    @DisplayName("GET /api/voucher/voucher-campaigns - Valid")
    void getAll_Endpoint() throws Exception {
        when(service.getAll()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/voucher-campaigns"))
                .andExpect(status().isOk());
    }

    // --- getActive ---
    @Test 
    @DisplayName("GET /api/voucher/voucher-campaigns/active - Valid")
    void getActive_Endpoint() throws Exception {
        when(service.getActiveCampaigns()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/voucher-campaigns/active"))
                .andExpect(status().isOk());
    }

    // --- getInactive ---
    @Test 
    @DisplayName("GET /api/voucher/voucher-campaigns/inactive - Valid")
    void getInactive_Endpoint() throws Exception {
        when(service.getInactiveCampaigns()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/voucher-campaigns/inactive"))
                .andExpect(status().isOk());
    }

    // --- toggle ---
    @Test 
    @DisplayName("PATCH /api/voucher/voucher-campaigns/{id}/toggle - Succes")
    void toggle_Endpoint() throws Exception {
        when(service.toggleStatus(1)).thenReturn(null);
        mockMvc.perform(patch("/api/voucher/voucher-campaigns/1/toggle"))
                .andExpect(status().isOk());
    }
}
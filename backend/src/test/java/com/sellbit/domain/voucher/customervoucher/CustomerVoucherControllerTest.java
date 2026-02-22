package com.sellbit.domain.voucher.customervoucher;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.time.LocalDateTime;

import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(CustomerVoucherController.class)
@AutoConfigureMockMvc(addFilters = false)
class CustomerVoucherControllerTest {

    @Autowired 
    private MockMvc mockMvc;

    @MockitoBean 
    private CustomerVoucherService voucherService;

    // Mock-uri necesare pentru pornirea contextului (JwtAuthenticationFilter dependințe)
    @MockitoBean 
    private JwtUtils jwtUtils;

    @MockitoBean 
    private UserDetailsService userDetailsService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;   

    @Test 
    void validate_ReturnsOk() throws Exception {
        when(voucherService.validateCode("C1")).thenReturn(
            new CustomerVoucherDTOs.ValidationResponse(
                "C1", "F", null, null, LocalDateTime.now(), null, "AVAILABLE", true, null));
        mockMvc.perform(get("/api/voucher/customer-vouchers/validate/C1"))
                .andExpect(status().isOk());
    }

    @Test 
    void consume_ReturnsOk() throws Exception {
        mockMvc.perform(post("/api/voucher/customer-vouchers/consume")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"C1\"}"))
                .andExpect(status().isOk());
        
        verify(voucherService).consumeVoucher(eq("C1"), nullable(Integer.class));
    }

    @Test
    void consume_WithReceiptId_ReturnsOk() throws Exception {
        mockMvc.perform(post("/api/voucher/customer-vouchers/consume")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"C1\",\"receiptId\":123}"))
                .andExpect(status().isOk());

        verify(voucherService).consumeVoucher("C1", 123);
    }

    @Test 
    void getAll_ReturnsList() throws Exception {
        when(voucherService.getAllVouchers()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/customer-vouchers"))
                .andExpect(status().isOk());
    }

    @Test 
    void getUsed_ReturnsList() throws Exception {
        when(voucherService.getUsedVouchers()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/customer-vouchers/used"))
                .andExpect(status().isOk());
    }

    @Test 
    void getAvailable_ReturnsList() throws Exception {
        when(voucherService.getAvailableVouchers()).thenReturn(List.of());
        mockMvc.perform(get("/api/voucher/customer-vouchers/available"))
                .andExpect(status().isOk());
    }
    
    @Test
    void reactivateVoucher() throws Exception {
        String code = "VOUCHER123";

        mockMvc.perform(post("/api/voucher/customer-vouchers/reactivate/" + code)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());

        verify(voucherService).reactivateVoucherByCode(code);
    }
}
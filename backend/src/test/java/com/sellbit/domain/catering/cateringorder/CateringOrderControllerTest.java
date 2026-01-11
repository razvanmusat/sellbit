package com.sellbit.domain.catering.cateringorder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CateringOrderControllerTest {

    private MockMvc mockMvc;
    private CateringOrderService orderService;
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @BeforeEach
    void setUp() {
        orderService = mock(CateringOrderService.class);
        
        // Setup standalone pentru a testa Controller-ul izolat de securitate.
        mockMvc = MockMvcBuilders.standaloneSetup(new CateringOrderController(orderService))
                .build();
    }

    @Test
    @DisplayName("POST /: Succes la creare comandă")
    void create_Success() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 5, LocalDate.now());
        var res = new CateringOrderDTOs.OrderResponse(1, 1, "Pizza", null, 5, LocalDate.now(), false, null, null);

        when(orderService.createOrder(any())).thenReturn(res);

        mockMvc.perform(post("/api/catering/catering-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("POST /: Eroare 400 la cantitate zero (Validation @Min(1))")
    void create_BadRequest_Quantity() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 0, LocalDate.now());

        mockMvc.perform(post("/api/catering/catering-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /bulk-pay: Succes")
    void bulkPay_Success() throws Exception {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of(1, 2, 3));

        mockMvc.perform(patch("/api/catering/catering-orders/bulk-pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
        
        verify(orderService).processBulkPayment(any());
    }

    @Test
    @DisplayName("PATCH /bulk-pay: Eroare 400 la listă goală (@NotEmpty)")
    void bulkPay_EmptyList_Returns400() throws Exception {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of());

        mockMvc.perform(patch("/api/catering/catering-orders/bulk-pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /daily: Eroare la format dată invalid")
    void getDaily_InvalidDate_Returns400() throws Exception {
        // Parametrul așteaptă ISO DATE (yyyy-MM-dd)
        mockMvc.perform(get("/api/catering/catering-orders/daily").param("date", "07/01/2026"))
                .andExpect(status().isBadRequest());
    }
}
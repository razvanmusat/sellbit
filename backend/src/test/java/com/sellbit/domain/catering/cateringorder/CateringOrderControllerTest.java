package com.sellbit.domain.catering.cateringorder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sellbit.domain.catalog.product.ProductDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
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
        mockMvc = MockMvcBuilders.standaloneSetup(new CateringOrderController(orderService))
                .build();
    }

    @Test
    @DisplayName("POST /: Succes la creare listă de comenzi")
    void create_Success() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 5, LocalDate.now());
        
        // ACUM ARE 12 ARGUMENTE (am adăugat null pentru reservationStartAt)
        var res = new CateringOrderDTOs.OrderResponse(
            1,                      // id
            1,                      // productId
            "Pizza",                // productName
            null,                   // reservationId
            null,                   // reservationName
            null,                   // reservationNote
            null,                   // reservationStartAt (LocalDateTime) <-- ASTA LIPSEA
            5,                      // quantity
            LocalDate.now(),        // orderDate
            false,                  // isPaid
            null,                   // paidAt
            LocalDateTime.now()     // createdAt
        );

        when(orderService.createOrder(anyList())).thenReturn(List.of(res));

        mockMvc.perform(post("/api/catering/catering-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(req))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].productName").value("Pizza"));
    }

    @Test
    @DisplayName("POST /: Eroare 400 la cantitate zero")
    void create_BadRequest_Quantity() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 0, LocalDate.now());

        mockMvc.perform(post("/api/catering/catering-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(req))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /available-products: Succes")
    void getAvailableProducts_Success() throws Exception {
        ProductDTO p = new ProductDTO(
                1, 
                "Meniu Pui", 
                "123456", 
                1,         
                1,         
                "REGULAR",  
                1,          
                1,         
                new BigDecimal("25.00"),
                new BigDecimal("15.00"),
                null,
                true,
                true,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        
        when(orderService.getAvailableCateringProducts()).thenReturn(List.of(p));

        mockMvc.perform(get("/api/catering/catering-orders/available-products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Meniu Pui"))
                .andExpect(jsonPath("$[0].salePrice").value(25.00));
    }

    @Test
    @DisplayName("PUT /{id}: Succes update")
    void update_Success() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 10, LocalDate.now());
        
        // ACUM ARE 12 ARGUMENTE
        var res = new CateringOrderDTOs.OrderResponse(
            1, 
            1, 
            "Pizza", 
            null, 
            null, 
            null, 
            null, // reservationStartAt <-- ASTA LIPSEA
            10, 
            LocalDate.now(), 
            false, 
            null, 
            null
        );

        when(orderService.updateOrder(eq(1), any())).thenReturn(res);

        mockMvc.perform(put("/api/catering/catering-orders/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(10));
    }

    @Test
    @DisplayName("DELETE /{id}: Succes anulare")
    void delete_Success() throws Exception {
        mockMvc.perform(delete("/api/catering/catering-orders/1"))
                .andExpect(status().isNoContent());

        verify(orderService).deleteOrder(1);
    }

    @Test
    @DisplayName("GET /daily: Succes")
    void getDaily_Success() throws Exception {
        when(orderService.getDailyOrders(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-orders/daily")
                        .param("date", "2026-01-07"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /unpaid: Succes")
    void getUnpaid_Success() throws Exception {
        when(orderService.getUnpaidOrders(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-orders/unpaid")
                        .param("start", "2026-01-01")
                        .param("end", "2026-01-31"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PATCH /bulk-pay: Succes")
    void bulkPay_Success() throws Exception {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of(1, 2, 3));

        mockMvc.perform(patch("/api/catering/catering-orders/bulk-pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /daily: Eroare la format dată invalid")
    void getDaily_InvalidDate_Returns400() throws Exception {
        mockMvc.perform(get("/api/catering/catering-orders/daily").param("date", "07/01/2026"))
                .andExpect(status().isBadRequest());
    }
}
package com.sellbit.domain.catering.cateringorder;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CateringOrderController.class, excludeAutoConfiguration = {
    org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
    org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class CateringOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CateringOrderService orderService;

    // --- 1. POST / (create) ---

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
    @DisplayName("POST /: Eroare 400 la cantitate zero sau negativă")
    void create_BadRequest_Quantity() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 0, LocalDate.now());

        mockMvc.perform(post("/api/catering/catering-orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- 2. PUT /{id} (update) ---

    @Test
    @DisplayName("PUT /{id}: Succes la actualizare")
    void update_Success() throws Exception {
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 10, LocalDate.now());
        var res = new CateringOrderDTOs.OrderResponse(1, 1, "Pizza", null, 10, LocalDate.now(), false, null, null);

        when(orderService.updateOrder(eq(1), any())).thenReturn(res);

        mockMvc.perform(put("/api/catering/catering-orders/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.quantity").value(10));
    }

    @Test
    @DisplayName("PUT /{id}: Eroare 400 dacă data lipsește din request")
    void update_BadRequest_MissingDate() throws Exception {
        String json = "{\"menuId\":1, \"quantity\":5}"; // Lipsește orderDate

        mockMvc.perform(put("/api/catering/catering-orders/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    // --- 3. DELETE /{id} ---

    @Test
    @DisplayName("DELETE /{id}: Succes (204 No Content)")
    void delete_Success() throws Exception {
        mockMvc.perform(delete("/api/catering/catering-orders/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("DELETE /{id}: Eroare 400 la ștergere comandă din trecut")
    void delete_Forbidden_PastDate() throws Exception {
        doThrow(new RuntimeException("ERROR.DELETE_FORBIDDEN")).when(orderService).deleteOrder(1);

        mockMvc.perform(delete("/api/catering/catering-orders/1"))
                .andExpect(status().isBadRequest());
    }

    // --- 4. GET /daily ---

    @Test
    @DisplayName("GET /daily: Succes returnare listă")
    void getDaily_Success() throws Exception {
        when(orderService.getDailyOrders(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-orders/daily").param("date", "2026-01-07"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /daily: Eroare 400 la format dată invalid")
    void getDaily_InvalidDateFormat() throws Exception {
        mockMvc.perform(get("/api/catering/catering-orders/daily").param("date", "07-01-2026"))
                .andExpect(status().isBadRequest());
    }

    // --- 5. GET /unpaid ---

    @Test
    @DisplayName("GET /unpaid: Succes returnare comenzi neplătite")
    void getUnpaid_Success() throws Exception {
        when(orderService.getUnpaidOrders(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-orders/unpaid")
                        .param("start", "2026-01-01")
                        .param("end", "2026-01-07"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /unpaid: Eroare 400 la lipsă parametri dată")
    void getUnpaid_MissingParams() throws Exception {
        mockMvc.perform(get("/api/catering/catering-orders/unpaid"))
                .andExpect(status().isBadRequest());
    }

    // --- 6. PATCH /bulk-pay ---

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
    @DisplayName("PATCH /bulk-pay: Eroare 400 la listă de ID-uri goală")
    void bulkPay_EmptyIds() throws Exception {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of());

        mockMvc.perform(patch("/api/catering/catering-orders/bulk-pay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }
}
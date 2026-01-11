package com.sellbit.domain.inventory.warehouse;

import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;

import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

@WebMvcTest(WarehouseController.class)
@AutoConfigureMockMvc(addFilters = false)
class WarehouseControllerTest {

    @Autowired 
    private MockMvc mockMvc;
    
    @Autowired 
    private ObjectMapper objectMapper;

    @MockitoBean 
    private WarehouseService warehouseService;

    // Mock-uri necesare pentru instanțierea filtrului de securitate în contextul de test
    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private static final String BASE_URL = "/api/warehouses";

    // --- 1. GET /active ---
    @Test
    @DisplayName("GET /active: Valid")
    void getAllActive_Valid() throws Exception {
        when(warehouseService.findAllActive()).thenReturn(List.of());
        mockMvc.perform(get(BASE_URL + "/active")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /active: Invalid (Cale greșită)")
    void getAllActive_Invalid() throws Exception {
        mockMvc.perform(get(BASE_URL + "/actives")).andExpect(status().isNotFound());
    }

    // --- 2. POST / ---
    @Test
    @DisplayName("POST /: Valid - Creare")
    void create_Valid() throws Exception {
        WarehouseDTOs.Create dto = new WarehouseDTOs.Create("W1", "Depozit");
        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /: Invalid - Body gol")
    void create_Invalid() throws Exception {
        mockMvc.perform(post(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());
    }

    // --- 3. PUT / ---
    @Test
    @DisplayName("PUT /: Valid - Update")
    void update_Valid() throws Exception {
        WarehouseDTOs.Update dto = new WarehouseDTOs.Update(1, "W1", "Nume");
        mockMvc.perform(put(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PUT /: Invalid - ID null")
    void update_Invalid() throws Exception {
        WarehouseDTOs.Update dto = new WarehouseDTOs.Update(null, "W1", "Nume");
        mockMvc.perform(put(BASE_URL)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest());
    }

    // --- 4. PATCH /toggle-status ---
    @Test
    @DisplayName("PATCH toggle: Valid")
    void toggleStatus_Valid() throws Exception {
        doNothing().when(warehouseService).toggleStatus(1);
        mockMvc.perform(patch(BASE_URL + "/1/toggle-status"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("PATCH toggle: Invalid - ID non-numeric")
    void toggleStatus_Invalid() throws Exception {
        mockMvc.perform(patch(BASE_URL + "/abc/toggle-status"))
                .andExpect(status().isBadRequest());
    }
}
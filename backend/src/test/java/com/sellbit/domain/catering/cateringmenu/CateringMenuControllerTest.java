package com.sellbit.domain.catering.cateringmenu;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CateringMenuControllerTest {

    private MockMvc mockMvc;
    private CateringMenuService menuService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
        menuService = mock(CateringMenuService.class);
        
        // standaloneSetup: Izolat de securitate. 
        // Am adăugat logica de bază pentru a procesa corect eventualele validări de obiecte.
        mockMvc = MockMvcBuilders.standaloneSetup(new CateringMenuController(menuService))
                .build();
    }

    @Test
    @DisplayName("POST /manage: Returnează 200 și obiectul creat")
    void create_ReturnsOk() throws Exception {
        var req = new CateringMenuDTOs.CreateMenuRequest(100, new BigDecimal("45.0"), true);
        var res = new CateringMenuDTOs.MenuFullResponse(1, 100, "Pizza", new BigDecimal("45.0"), true, LocalDateTime.now(), null);

        when(menuService.createMenu(any())).thenReturn(res);

        mockMvc.perform(post("/api/catering/catering-menus/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productName").value("Pizza"));
    }

    @Test
    @DisplayName("POST /manage: Returnează 400 dacă prețul este negativ")
    void create_InvalidPrice_Returns400() throws Exception {
        // Validation constraint: @PositiveOrZero pe câmpul amount
        var req = new CateringMenuDTOs.CreateMenuRequest(100, new BigDecimal("-10.0"), true);

        mockMvc.perform(post("/api/catering/catering-menus/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /catalog: Returnează lista scurtă pentru staff")
    void getCatalog_ReturnsList() throws Exception {
        var res = new CateringMenuDTOs.MenuShortResponse(100, "Pizza Catering");
        when(menuService.getActiveMenus()).thenReturn(List.of(res));

        mockMvc.perform(get("/api/catering/catering-menus/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].productName").value("Pizza Catering"));
    }

    @Test
    @DisplayName("PATCH /manage/{id}/toggle-status: Schimbă starea")
    void toggle_ReturnsOk() throws Exception {
        var res = new CateringMenuDTOs.MenuFullResponse(1, 100, "Pizza", BigDecimal.TEN, false, null, null);
        when(menuService.toggleStatus(1)).thenReturn(res);

        mockMvc.perform(patch("/api/catering/catering-menus/manage/1/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));
    }
}
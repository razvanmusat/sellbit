package com.sellbit.domain.catering.cateringmenu;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CateringMenuController.class, excludeAutoConfiguration = {
    org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class,
    org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class
})
class CateringMenuControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private CateringMenuService menuService;

    // --- 1. POST /manage (create) ---

    @Test
    @DisplayName("POST /manage: Succes la date valide")
    void create_Success() throws Exception {
        var req = new CateringMenuDTOs.CreateMenuRequest("Pizza", new BigDecimal("45.0"), true);
        var res = new CateringMenuDTOs.MenuFullResponse(1, "Pizza", new BigDecimal("45.0"), true, LocalDateTime.now(), null);

        when(menuService.createMenu(any())).thenReturn(res);

        mockMvc.perform(post("/api/catering/catering-menus/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("POST /manage: Eroare 400 la preț negativ")
    void create_BadRequest_Price() throws Exception {
        var req = new CateringMenuDTOs.CreateMenuRequest("Pizza", new BigDecimal("-5"), true);

        mockMvc.perform(post("/api/catering/catering-menus/manage")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // --- 2. GET /manage/active ---

    @Test
    @DisplayName("GET /manage/active: Returnează lista de meniuri active")
    void getActive_Success() throws Exception {
        var res = new CateringMenuDTOs.MenuFullResponse(1, "Pizza", new BigDecimal("45.0"), true, null, null);
        when(menuService.getActiveMenusFull()).thenReturn(List.of(res));

        mockMvc.perform(get("/api/catering/catering-menus/manage/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("GET /manage/active: Returnează 200 chiar dacă nu există date")
    void getActive_Empty() throws Exception {
        when(menuService.getActiveMenusFull()).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-menus/manage/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // --- 3. GET /manage/inactive ---

    @Test
    @DisplayName("GET /manage/inactive: Returnează meniurile arhivate")
    void getInactive_Success() throws Exception {
        var res = new CateringMenuDTOs.MenuFullResponse(2, "Meniu Vechi", new BigDecimal("30.0"), false, null, null);
        when(menuService.getInactiveMenus()).thenReturn(List.of(res));

        mockMvc.perform(get("/api/catering/catering-menus/manage/inactive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].isActive").value(false));
    }

    @Test
    @DisplayName("GET /manage/inactive: Returnează status 200 pentru listă goală")
    void getInactive_Empty() throws Exception {
        when(menuService.getInactiveMenus()).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-menus/manage/inactive"))
                .andExpect(status().isOk());
    }

    // --- 4. PATCH /manage/{id}/toggle-status ---

    @Test
    @DisplayName("PATCH /toggle-status: Succes la schimbarea statusului")
    void toggle_Success() throws Exception {
        var res = new CateringMenuDTOs.MenuFullResponse(1, "Pizza", BigDecimal.TEN, false, null, null);
        when(menuService.toggleStatus(1)).thenReturn(res);

        mockMvc.perform(patch("/api/catering/catering-menus/manage/1/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));
    }

    @Test
    @DisplayName("PATCH /toggle-status: Eroare când produsul nu există")
    void toggle_NotFound() throws Exception {
        when(menuService.toggleStatus(99)).thenThrow(new RuntimeException("Not found"));

        mockMvc.perform(patch("/api/catering/catering-menus/manage/99/toggle-status"))
                .andExpect(status().isBadRequest()); 
    }
    // --- 5. GET /catalog ---

    @Test
    @DisplayName("GET /catalog: Returnează lista scurtă pentru staff")
    void getCatalog_Success() throws Exception {
        var res = new CateringMenuDTOs.MenuShortResponse(1, "Pizza");
        when(menuService.getActiveMenus()).thenReturn(List.of(res));

        mockMvc.perform(get("/api/catering/catering-menus/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Pizza"))
                .andExpect(jsonPath("$[0].purchasePrice").doesNotExist());
    }

    @Test
    @DisplayName("GET /catalog: Returnează 200 la apel catalog fără date")
    void getCatalog_Empty() throws Exception {
        when(menuService.getActiveMenus()).thenReturn(List.of());

        mockMvc.perform(get("/api/catering/catering-menus/catalog"))
                .andExpect(status().isOk());
    }
}
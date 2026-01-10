package com.sellbit.domain.catalog.productcomposite;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public class ProductCompositeControllerTest {

    private MockMvc mockMvc;
    private ProductCompositeService compositeService;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        compositeService = mock(ProductCompositeService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new ProductCompositeController(compositeService)).build();
    }

    @Test
    void getActive_Returns200() throws Exception {
        var dto = new ProductCompositeDTOs.CompositionResponse(2, "Test", BigDecimal.ONE, "Buc");
        when(compositeService.getActiveComponents(1)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/catalog/product_components/parent/1/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].childProductName").value("Test"));
    }

    @Test
    void create_Returns201() throws Exception {
        // Obiect valid: are părinte și cel puțin o componentă
        var item = new ProductCompositeDTOs.ComponentItemRequest(2, BigDecimal.ONE);
        var req = new ProductCompositeDTOs.SaveCompositionRequest(1, List.of(item));

        mockMvc.perform(post("/api/catalog/product_components")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isCreated());
    }

    @Test
    void update_Returns200() throws Exception {
        var item = new ProductCompositeDTOs.ComponentItemRequest(2, BigDecimal.ONE);
        var req = new ProductCompositeDTOs.SaveCompositionRequest(1, List.of(item));

        mockMvc.perform(put("/api/catalog/product_components")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    void delete_Returns204() throws Exception {
        mockMvc.perform(delete("/api/catalog/product_components/parent/1"))
                .andExpect(status().isNoContent());

        verify(compositeService).softDeleteComposition(1);
    }
}
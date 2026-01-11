package com.sellbit.domain.catalog.category;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CategoryControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CategoryService categoryService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private CategoryDTO categoryDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());

        // Setup standalone: Încarcă doar controller-ul, ignorând complet filtrele de securitate/JWT
        CategoryController categoryController = new CategoryController(categoryService);
        mockMvc = MockMvcBuilders.standaloneSetup(categoryController).build();
        
        categoryDTO = new CategoryDTO(1, "CAT01", "Electronice", null, true, null, null);
    }

    @Test
    void getCategories_WithParentId_ShouldReturnList() throws Exception {
        when(categoryService.getCategoriesByParent(10)).thenReturn(List.of(categoryDTO));

        mockMvc.perform(get("/api/catalog/categories").param("parentId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Electronice"));
    }

    @Test
    void getCategories_WithoutParentId_ShouldReturnRoots() throws Exception {
        when(categoryService.getCategoriesByParent(null)).thenReturn(List.of(categoryDTO));

        mockMvc.perform(get("/api/catalog/categories"))
                .andExpect(status().isOk());
    }

    @Test
    void getLeafCategories_ShouldReturnList() throws Exception {
        when(categoryService.getLeafCategories()).thenReturn(List.of(categoryDTO));

        mockMvc.perform(get("/api/catalog/categories/leaves"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void getAllCategories_ShouldReturnFullList() throws Exception {
        when(categoryService.getAllCategoriesForAdmin()).thenReturn(List.of(categoryDTO));

        mockMvc.perform(get("/api/catalog/categories/all"))
                .andExpect(status().isOk());
    }

    @Test
    void create_ShouldReturnDto() throws Exception {
        when(categoryService.createCategory(any(CategoryDTO.class))).thenReturn(categoryDTO);

        mockMvc.perform(post("/api/catalog/categories")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("CAT01"));
    }

    @Test
    void update_ShouldReturnDto() throws Exception {
        when(categoryService.updateCategory(eq(1), any(CategoryDTO.class))).thenReturn(categoryDTO);

        mockMvc.perform(put("/api/catalog/categories/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(categoryDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void toggleStatus_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(patch("/api/catalog/categories/1/status")
                .param("active", "false"))
                .andExpect(status().isNoContent());
    }
}
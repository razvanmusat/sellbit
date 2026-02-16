package com.sellbit.domain.catalog.product;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ProductService productService;

    @InjectMocks
    private ProductController productController;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ProductDTO productDTO;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
        mockMvc = MockMvcBuilders.standaloneSetup(productController).build();
        
        productDTO = new ProductDTO(
                1, 
                "Produs Test", 
                "123", 
                10, 
                1, 
                "REGULAR",
                1, 
                1, 
                new BigDecimal("50.0"), 
                new BigDecimal("20.0"), 
                true, 
                true, 
                null, 
                null
        );
    }

    @Test
    void getForAdmin_ShouldReturnList() throws Exception {
        when(productService.getProductsForAdmin(10)).thenReturn(List.of(productDTO));

        mockMvc.perform(get("/api/catalog/products/admin")
                .param("categoryId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Produs Test"));
    }

    @Test
    void getByBarcode_ShouldReturnProduct() throws Exception {
        when(productService.getProductByBarcode("123")).thenReturn(productDTO);

        mockMvc.perform(get("/api/catalog/products/pos/barcode/123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.barcode").value("123"));
    }

    @Test
    void create_ShouldReturnCreatedProduct() throws Exception {
        when(productService.createProduct(any(ProductDTO.class))).thenReturn(productDTO);

        mockMvc.perform(post("/api/catalog/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Produs Test"));
    }

    @Test
    void update_ShouldReturnUpdatedProduct() throws Exception {
        when(productService.updateProduct(eq(1), any(ProductDTO.class))).thenReturn(productDTO);

        mockMvc.perform(put("/api/catalog/products/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isOk());
    }

    @Test
    void move_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(patch("/api/catalog/products/1/move")
                .param("newCategoryId", "20"))
                .andExpect(status().isNoContent());
    }

    @Test
    void toggleStatus_ShouldReturnNoContent() throws Exception {
        mockMvc.perform(patch("/api/catalog/products/1/status")
                .param("active", "false"))
                .andExpect(status().isNoContent());
    }

    @Test
    void searchForPos_ShouldReturnList() throws Exception {
        when(productService.searchForPos("paine")).thenReturn(List.of(productDTO));

        mockMvc.perform(get("/api/catalog/products/pos/search")
                .param("query", "paine"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
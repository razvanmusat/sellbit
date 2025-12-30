package com.sellbit.domain.catalog.product;

import com.sellbit.domain.catalog.category.Category;
import com.sellbit.domain.catalog.category.CategoryRepository;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.producttype.ProductTypeRepository;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasure;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasureRepository;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.lookup.vatrate.VatRateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private UnitOfMeasureRepository unitOfMeasureRepository;
    @Mock private VatRateRepository vatRateRepository;
    @Mock private ProductTypeRepository productTypeRepository;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(
                productRepository,
                categoryRepository,
                unitOfMeasureRepository,
                vatRateRepository,
                productTypeRepository
        );
    }

    @Test
    void getProductsForAdmin_ShouldReturnList() {
        Product p = new Product();
        p.setCategory(new Category());
        p.setUnit(new UnitOfMeasure());
        p.setProductType(new ProductType());
        
        when(productRepository.findByCategoryIdOrderByNameAsc(1)).thenReturn(List.of(p));
        
        List<ProductDTO> result = productService.getProductsForAdmin(1);
        
        assertFalse(result.isEmpty());
        verify(productRepository).findByCategoryIdOrderByNameAsc(1);
    }

    @Test
    void getProductByBarcode_ShouldReturnDto() {
        Product p = new Product();
        p.setIsActive(true);
        p.setCategory(new Category());
        p.setUnit(new UnitOfMeasure());
        p.setProductType(new ProductType());

        when(productRepository.findByBarcode("123")).thenReturn(Optional.of(p));

        ProductDTO result = productService.getProductByBarcode("123");

        assertNotNull(result);
    }

    @Test
    void getProductByBarcode_ShouldThrowIfInactive() {
        Product p = new Product();
        p.setIsActive(false);

        when(productRepository.findByBarcode("123")).thenReturn(Optional.of(p));

        assertThrows(RuntimeException.class, () -> productService.getProductByBarcode("123"));
    }

    @Test
    void createProduct_ShouldSaveSuccessfully() {
        ProductDTO dto = new ProductDTO(null, "Prod", "123", 10, 1, 1, 1, new BigDecimal("10"), true, true, null, null);
        
        when(productRepository.existsByBarcode("123")).thenReturn(false);
        when(categoryRepository.findById(10)).thenReturn(Optional.of(new Category()));
        when(unitOfMeasureRepository.findById(1)).thenReturn(Optional.of(new UnitOfMeasure()));
        when(productTypeRepository.findById(1)).thenReturn(Optional.of(new ProductType()));
        when(vatRateRepository.findById(1)).thenReturn(Optional.of(new VatRate()));
        
        Product p = new Product();
        p.setCategory(new Category());
        p.setUnit(new UnitOfMeasure());
        p.setProductType(new ProductType());
        when(productRepository.save(any(Product.class))).thenReturn(p);

        productService.createProduct(dto);

        verify(productRepository).save(any(Product.class));
    }

    @Test
    void updateProduct_ShouldUpdateFields() {
        Product existing = new Product();
        existing.setId(1);
        existing.setBarcode("old");
        existing.setCategory(new Category());
        existing.setUnit(new UnitOfMeasure());
        existing.setProductType(new ProductType());

        ProductDTO dto = new ProductDTO(1, "New", "new", 10, 1, 1, null, new BigDecimal("20"), true, true, null, null);

        when(productRepository.findById(1)).thenReturn(Optional.of(existing));
        when(productRepository.existsByBarcode("new")).thenReturn(false);
        when(categoryRepository.findById(10)).thenReturn(Optional.of(new Category()));
        when(unitOfMeasureRepository.findById(1)).thenReturn(Optional.of(new UnitOfMeasure()));
        when(productTypeRepository.findById(1)).thenReturn(Optional.of(new ProductType()));
        when(productRepository.save(any(Product.class))).thenReturn(existing);

        productService.updateProduct(1, dto);

        verify(productRepository).save(existing);
    }

    @Test
    void moveProduct_ShouldUpdateCategory() {
        Product p = new Product();
        Category c = new Category();
        c.setId(10);

        when(productRepository.findById(1)).thenReturn(Optional.of(p));
        when(categoryRepository.findById(10)).thenReturn(Optional.of(c));
        when(categoryRepository.existsByParent_Id(10)).thenReturn(false);

        productService.moveProduct(1, 10);

        assertEquals(10, p.getCategory().getId());
        verify(productRepository).save(p);
    }

    @Test
    void toggleStatus_ShouldChangeFlag() {
        Product p = new Product();
        p.setId(1);
        p.setIsActive(true);

        when(productRepository.findById(1)).thenReturn(Optional.of(p));

        productService.toggleStatus(1, false);

        assertFalse(p.getIsActive());
        verify(productRepository).save(p);
    }
}
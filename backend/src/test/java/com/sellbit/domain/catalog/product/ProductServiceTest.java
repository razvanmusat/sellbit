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
        // PREGĂTIRE: Entitate completă pentru a trece de convertToDTO fără NullPointerException
        Product p = new Product();
        p.setId(1);
        p.setName("Test");
        
        Category c = new Category(); 
        c.setId(10); // ID necesar pentru convertToDTO
        p.setCategory(c);
        
        UnitOfMeasure u = new UnitOfMeasure(); 
        u.setId(1);
        p.setUnit(u);
        
        ProductType pt = new ProductType(); 
        pt.setId(1); 
        pt.setCode("REGULAR"); // COD necesar pentru convertToDTO
        p.setProductType(pt);
        
        VatRate v = new VatRate(); 
        v.setId(1);
        p.setVatRate(v);
        
        when(productRepository.findByCategoryIdOrderByNameAsc(10)).thenReturn(List.of(p));
        
        // EXECUȚIE
        List<ProductDTO> result = productService.getProductsForAdmin(10);
        
        // VERIFICARE
        assertFalse(result.isEmpty());
        assertEquals("REGULAR", result.get(0).productTypeCode());
        verify(productRepository).findByCategoryIdOrderByNameAsc(10);
    }

    @Test
    void getProductByBarcode_ShouldReturnDto() {
        Product p = new Product();
        p.setId(1);
        p.setIsActive(true);
        p.setBarcode("123");
        p.setName("Test");

        Category c = new Category(); c.setId(10);
        p.setCategory(c);

        UnitOfMeasure u = new UnitOfMeasure(); u.setId(1);
        p.setUnit(u);

        ProductType pt = new ProductType(); pt.setId(1); pt.setCode("REGULAR");
        p.setProductType(pt);
        
        VatRate v = new VatRate(); v.setId(1);
        p.setVatRate(v);

        when(productRepository.findByBarcode("123")).thenReturn(Optional.of(p));

        ProductDTO result = productService.getProductByBarcode("123");

        assertNotNull(result);
        assertEquals("123", result.barcode());
    }

    @Test
    void createProduct_ShouldSaveSuccessfully() {
        // DTO Intrare
        ProductDTO dto = new ProductDTO(
                null, "Prod", "123", 10, 1, "REGULAR", 1, 1, 
                new BigDecimal("10"), new BigDecimal("5"), true, true, null, null
        );
        
        // MOCK-uri
        when(productRepository.existsByBarcode("123")).thenReturn(false);
        
        // 1. CATEGORIE (FIXUL PENTRU STRICT STUBBING)
        Category dbCategory = new Category();
        dbCategory.setId(10); // <--- ID-ul este CRITIC aici!
        when(categoryRepository.findById(10)).thenReturn(Optional.of(dbCategory));
        
        // Acum serviciul va apela existsByParent_Id(10) (nu null), deci se potrivește:
        when(categoryRepository.existsByParent_Id(10)).thenReturn(false);
        
        // 2. UNITATE
        UnitOfMeasure dbUnit = new UnitOfMeasure(); dbUnit.setId(1);
        when(unitOfMeasureRepository.findById(1)).thenReturn(Optional.of(dbUnit));
        
        // 3. TIP PRODUS (pt logică stoc)
        ProductType dbType = new ProductType();
        dbType.setId(1);
        dbType.setCode("REGULAR");
        when(productTypeRepository.findById(1)).thenReturn(Optional.of(dbType));
        
        // 4. TVA
        VatRate dbVat = new VatRate(); dbVat.setId(1);
        when(vatRateRepository.findById(1)).thenReturn(Optional.of(dbVat));
        
        // 5. SAVE
        when(productRepository.save(any(Product.class))).thenAnswer(i -> {
            Product toSave = i.getArgument(0);
            toSave.setId(99); // Simulăm generarea ID-ului
            return toSave;
        });

        ProductDTO result = productService.createProduct(dto);

        assertNotNull(result);
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void updateProduct_ShouldUpdateFields() {
        // Produs existent
        Product existing = new Product();
        existing.setId(1);
        existing.setBarcode("old");
        existing.setName("Old Name");
        existing.setCategory(new Category()); existing.getCategory().setId(99);
        existing.setUnit(new UnitOfMeasure());
        existing.setProductType(new ProductType());

        // DTO Update
        ProductDTO dto = new ProductDTO(
                1, "New Name", "new", 10, 1, "REGULAR", 1, 1, 
                new BigDecimal("20"), new BigDecimal("10"), true, true, null, null
        );

        // MOCK-uri DB
        Category dbCategory = new Category(); dbCategory.setId(10); // ID CRITIC
        ProductType dbType = new ProductType(); dbType.setId(1); dbType.setCode("REGULAR");
        VatRate dbVat = new VatRate(); dbVat.setId(1);
        UnitOfMeasure dbUnit = new UnitOfMeasure(); dbUnit.setId(1);

        when(productRepository.findById(1)).thenReturn(Optional.of(existing));
        when(productRepository.existsByBarcode("new")).thenReturn(false);
        
        // Logica mapDtoToEntity
        when(categoryRepository.findById(10)).thenReturn(Optional.of(dbCategory));
        when(categoryRepository.existsByParent_Id(10)).thenReturn(false);
        
        when(unitOfMeasureRepository.findById(1)).thenReturn(Optional.of(dbUnit));
        when(productTypeRepository.findById(1)).thenReturn(Optional.of(dbType));
        when(vatRateRepository.findById(1)).thenReturn(Optional.of(dbVat));
        
        when(productRepository.save(any(Product.class))).thenAnswer(i -> i.getArgument(0));

        productService.updateProduct(1, dto);

        verify(productRepository).save(existing);
        assertEquals("New Name", existing.getName());
    }

    @Test
    void moveProduct_ShouldUpdateCategory() {
        Product p = new Product();
        p.setId(1);
        
        Category c = new Category();
        c.setId(10); // ID CRITIC

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
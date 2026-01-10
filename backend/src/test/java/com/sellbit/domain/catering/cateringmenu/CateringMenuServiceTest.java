package com.sellbit.domain.catering.cateringmenu;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.lookup.producttype.ProductType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CateringMenuServiceTest {

    @Mock private CateringMenuRepository menuRepository;
    @Mock private ProductRepository productRepository;
    @InjectMocks private CateringMenuService menuService;

    private Product cateringProduct;

    @BeforeEach
    void setUp() {
        ProductType type = ProductType.builder().code("CATERING").build();
        cateringProduct = Product.builder().id(100).name("Meniu Test").productType(type).build();
    }

    @Test
    @DisplayName("createMenu: Succes când produsul este tip CATERING și nu este duplicat")
    void createMenu_Success() {
        var req = new CateringMenuDTOs.CreateMenuRequest(100, new BigDecimal("50.0"), true);
        
        when(productRepository.findById(100)).thenReturn(Optional.of(cateringProduct));
        when(menuRepository.findByProductIdAndIsActiveTrue(100)).thenReturn(Optional.empty());
        
        var menuToSave = CateringMenu.builder().id(1).productId(100).purchasePrice(req.purchasePrice()).isActive(true).build();
        when(menuRepository.save(any())).thenReturn(menuToSave);

        var result = menuService.createMenu(req);

        assertNotNull(result);
        assertEquals("Meniu Test", result.productName());
        verify(menuRepository).save(any());
    }

    @Test
    @DisplayName("createMenu: Aruncă eroare dacă produsul nu este tip CATERING")
    void createMenu_InvalidType_ThrowsException() {
        Product regularProduct = Product.builder().id(101).productType(ProductType.builder().code("REGULAR").build()).build();
        var req = new CateringMenuDTOs.CreateMenuRequest(101, BigDecimal.TEN, true);
        
        when(productRepository.findById(101)).thenReturn(Optional.of(regularProduct));

        assertThrows(RuntimeException.class, () -> menuService.createMenu(req));
    }

    @Test
    @DisplayName("createMenu: Aruncă eroare dacă produsul este deja configurat")
    void createMenu_AlreadyExists_ThrowsException() {
        var req = new CateringMenuDTOs.CreateMenuRequest(100, BigDecimal.TEN, true);
        
        when(productRepository.findById(100)).thenReturn(Optional.of(cateringProduct));
        when(menuRepository.findByProductIdAndIsActiveTrue(100)).thenReturn(Optional.of(new CateringMenu()));

        assertThrows(RuntimeException.class, () -> menuService.createMenu(req));
    }

    @Test
    @DisplayName("toggleStatus: Schimbă statusul boolean")
    void toggleStatus_Success() {
        var menu = CateringMenu.builder().id(1).productId(100).isActive(true).build();
        when(menuRepository.findById(1)).thenReturn(Optional.of(menu));
        when(productRepository.findById(100)).thenReturn(Optional.of(cateringProduct));

        var result = menuService.toggleStatus(1);

        assertFalse(result.isActive());
    }
}
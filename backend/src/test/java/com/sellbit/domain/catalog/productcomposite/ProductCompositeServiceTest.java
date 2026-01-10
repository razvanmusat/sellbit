package com.sellbit.domain.catalog.productcomposite;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasure;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProductCompositeServiceTest {

    @Mock private ProductComponentRepository componentRepository;
    @Mock private ProductRepository productRepository;
    @InjectMocks private ProductCompositeService compositeService;

    private Product parent;
    private Product child;
    private ProductComponent component;

    @BeforeEach
    void setUp() {
        UnitOfMeasure uom = UnitOfMeasure.builder().id(1).code("BUC").label("Bucată").build();
        parent = Product.builder().id(1).name("Pizza").build();
        child = Product.builder().id(2).name("Aluat").unit(uom).build();
        
        component = ProductComponent.builder()
                .id(10).parentProduct(parent).childProduct(child)
                .quantity(new BigDecimal("1.0")).isActive(true).build();
    }

    @Test
    @DisplayName("getActiveComponents - returnează lista corect mapată")
    void getActiveComponents_Success() {
        when(componentRepository.findByParentProductIdAndIsActiveTrue(1)).thenReturn(List.of(component));
        var result = compositeService.getActiveComponents(1);
        assertEquals(1, result.size());
        assertEquals("Bucată", result.get(0).unitLabel());
    }

    @Test
    @DisplayName("createComposition - salvează rețeta când datele sunt valide")
    void create_Success() {
        var itemReq = new ProductCompositeDTOs.ComponentItemRequest(2, BigDecimal.ONE);
        var req = new ProductCompositeDTOs.SaveCompositionRequest(1, List.of(itemReq));
        
        when(productRepository.findById(1)).thenReturn(Optional.of(parent));
        when(productRepository.findById(2)).thenReturn(Optional.of(child));

        compositeService.createComposition(req);
        
        verify(componentRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("updateComposition - dezactivează vechiul rețetar și salvează componente noi")
    void update_Success() {
        var itemReq = new ProductCompositeDTOs.ComponentItemRequest(2, BigDecimal.ONE);
        var req = new ProductCompositeDTOs.SaveCompositionRequest(1, List.of(itemReq));
        
        when(productRepository.findById(1)).thenReturn(Optional.of(parent));
        when(productRepository.findById(2)).thenReturn(Optional.of(child));

        compositeService.updateComposition(req);

        verify(componentRepository).deactivateComponentsByParentId(1);
        verify(componentRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("createComposition - ignoră salvarea dacă lista de componente e goală")
    void create_EmptyList_NoSave() {
        var req = new ProductCompositeDTOs.SaveCompositionRequest(1, List.of());
        when(productRepository.findById(1)).thenReturn(Optional.of(parent));

        compositeService.createComposition(req);

        verify(componentRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("softDeleteComposition - execută dezactivarea în DB")
    void delete_Success() {
        compositeService.softDeleteComposition(1);
        verify(componentRepository).deactivateComponentsByParentId(1);
    }
}
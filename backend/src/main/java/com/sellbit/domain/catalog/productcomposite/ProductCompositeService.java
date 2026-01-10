package com.sellbit.domain.catalog.productcomposite;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProductCompositeService {

    private final ProductComponentRepository componentRepository;
    private final ProductRepository productRepository;

    /**
     * 1. Obține toate componentele ACTIVE pentru un meniu (pentru UI/Vânzare)
     */
    @Transactional(readOnly = true)
    public List<ProductCompositeDTOs.CompositionResponse> getActiveComponents(Integer parentProductId) {
        return componentRepository.findByParentProductIdAndIsActiveTrue(parentProductId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * 2. Obține istoricul componentelor INACTIVE (pentru Audit/Istoric)
     */
    @Transactional(readOnly = true)
    public List<ProductCompositeDTOs.CompositionResponse> getInactiveComponents(Integer parentProductId) {
        return componentRepository.findByParentProductIdAndIsActiveFalse(parentProductId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * 3. Creare rețetar pentru un meniu nou
     */
    @Transactional
    public void createComposition(ProductCompositeDTOs.SaveCompositionRequest request) {
        Product parent = productRepository.findById(request.parentProductId())
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        saveNewComponentList(parent, request.components());
    }

    /**
     * 4. Update meniu existent: dezactivează ce a fost și pune noua rețetă
     */
    @Transactional
    public void updateComposition(ProductCompositeDTOs.SaveCompositionRequest request) {
        // Dezactivăm tot ce era activ înainte
        componentRepository.deactivateComponentsByParentId(request.parentProductId());

        // Salvăm noua listă
        Product parent = productRepository.findById(request.parentProductId())
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));
        
        saveNewComponentList(parent, request.components());
    }

    /**
     * 5. Soft Delete: Dezactivează logica meniului (rețetarului)
     */
    @Transactional
    public void softDeleteComposition(Integer parentProductId) {
        componentRepository.deactivateComponentsByParentId(parentProductId);
    }

    // --- METODE HELPER PRIVATE ---

    private void saveNewComponentList(Product parent, List<ProductCompositeDTOs.ComponentItemRequest> componentRequests) {
        if (componentRequests == null || componentRequests.isEmpty()) return;

        List<ProductComponent> newComponents = componentRequests.stream()
                .map(req -> {
                    Product child = productRepository.findById(req.childProductId())
                            .orElseThrow(() -> new RuntimeException("ERROR.CHILD_PRODUCT.NOT_FOUND"));
                    
                    return ProductComponent.builder()
                            .parentProduct(parent)
                            .childProduct(child)
                            .quantity(req.quantity())
                            .isActive(true)
                            .build();
                })
                .collect(Collectors.toList());

        componentRepository.saveAll(newComponents);
    }

    private ProductCompositeDTOs.CompositionResponse mapToResponse(ProductComponent comp) {
        return new ProductCompositeDTOs.CompositionResponse(
                comp.getChildProduct().getId(),
                comp.getChildProduct().getName(),
                comp.getQuantity(),
                comp.getChildProduct().getUnit() != null ? comp.getChildProduct().getUnit().getLabel() : "buc"
        );
    }
}
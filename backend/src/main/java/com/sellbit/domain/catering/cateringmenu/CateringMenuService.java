package com.sellbit.domain.catering.cateringmenu;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CateringMenuService {

    private final CateringMenuRepository menuRepository;
    private final ProductRepository productRepository;

    // --- METODE PENTRU ADMIN ---

    @Transactional
    public CateringMenuDTOs.MenuFullResponse createMenu(CateringMenuDTOs.CreateMenuRequest req) {
    	// 1. Verificăm dacă produsul există și dacă este de tip CATERING
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        if (product.getProductType() == null || !"CATERING".equals(product.getProductType().getCode())) {
            throw new RuntimeException("ERROR.CATERING_MENU.INVALID_PRODUCT_TYPE");
        }

        // 2. Verificăm dacă nu cumva există deja configurat în catering_menus
        // Folosim Optional-ul pe care îl ai deja în repository
        if (menuRepository.findByProductIdAndIsActiveTrue(req.productId()).isPresent()) {
            throw new RuntimeException("ERROR.CATERING_MENU.ALREADY_EXISTS");
        }
        
    	CateringMenu menu = CateringMenu.builder()
                .productId(req.productId())
                .purchasePrice(req.purchasePrice())
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
        
        CateringMenu saved = menuRepository.save(menu);
        return mapToFullResponse(saved);
    }

    @Transactional
    public CateringMenuDTOs.MenuFullResponse toggleStatus(Integer id) {
        CateringMenu menu = menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_MENU.NOT_FOUND"));
        
        menu.setIsActive(!menu.getIsActive());
        return mapToFullResponse(menu);
    }
    
    // Apelăm metoda cu @Query care face JOIN cu Product pentru sortare corectă
    public List<CateringMenuDTOs.MenuFullResponse> getActiveMenusFull() {
        return menuRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(this::mapToFullResponse)
                .toList();
    }

    // Apelăm metoda cu @Query pentru lista inactivă sortată alfabetic
    public List<CateringMenuDTOs.MenuFullResponse> getInactiveMenus() {
        return menuRepository.findByIsActiveFalseOrderByNameAsc().stream()
                .map(this::mapToFullResponse)
                .toList();
    }

    // --- METODE COMUNE / ANGAJAȚI ---

    public List<CateringMenuDTOs.MenuShortResponse> getActiveMenus() {
        return menuRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(m -> {
                    String name = productRepository.findById(m.getProductId())
                            .map(Product::getName)
                            .orElse("Produs Necunoscut");
                    return new CateringMenuDTOs.MenuShortResponse(m.getProductId(), name);
                })
                .toList();
    }
    
    public List<CateringMenuDTOs.MenuShortResponse> getAvailableCateringProducts() {
        return productRepository.findByProductTypeCode("CATERING").stream()
                .map(p -> new CateringMenuDTOs.MenuShortResponse(
                        p.getId(), 
                        p.getName()
                ))
                .toList();
    }

    // --- HELPER MAPPING ---

    private CateringMenuDTOs.MenuFullResponse mapToFullResponse(CateringMenu m) {
        String name = productRepository.findById(m.getProductId())
                .map(Product::getName)
                .orElse("Produs Necunoscut");

        return new CateringMenuDTOs.MenuFullResponse(
                m.getId(), 
                m.getProductId(), 
                name,
                m.getPurchasePrice(), 
                m.getIsActive(), 
                m.getCreatedAt(), 
                m.getUpdatedAt()
        );
    }
}
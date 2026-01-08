package com.sellbit.domain.catering.cateringmenu;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CateringMenuService {

    private final CateringMenuRepository menuRepository;

    // --- METODE PENTRU ADMIN ---

    @Transactional
    public CateringMenuDTOs.MenuFullResponse createMenu(CateringMenuDTOs.CreateMenuRequest req) {
        CateringMenu menu = CateringMenu.builder()
                .name(req.name())
                .purchasePrice(req.purchasePrice())
                .isActive(req.isActive() != null ? req.isActive() : true)
                .build();
        
        CateringMenu saved = menuRepository.save(menu);
        return mapToFullResponse(saved);
    }

    @Transactional
    public CateringMenuDTOs.MenuFullResponse toggleStatus(Integer id) {
        CateringMenu menu = menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catering menu not found with id: " + id));
        
        menu.setIsActive(!menu.getIsActive());
        return mapToFullResponse(menu);
    }
    
    //Returnează meniurile active cu toate detaliile (inclusiv preț).
    public List<CateringMenuDTOs.MenuFullResponse> getActiveMenusFull() {
        return menuRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(this::mapToFullResponse)
                .toList();
    }

    public List<CateringMenuDTOs.MenuFullResponse> getInactiveMenus() {
        return menuRepository.findByIsActiveFalseOrderByNameAsc().stream()
                .map(this::mapToFullResponse)
                .toList();
    }

    // --- METODE COMUNE / ANGAJAȚI ---

    public List<CateringMenuDTOs.MenuShortResponse> getActiveMenus() {
        return menuRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(m -> new CateringMenuDTOs.MenuShortResponse(m.getId(), m.getName()))
                .toList();
    }

    // --- HELPER MAPPING ---

    private CateringMenuDTOs.MenuFullResponse mapToFullResponse(CateringMenu m) {
        return new CateringMenuDTOs.MenuFullResponse(
                m.getId(), 
                m.getName(), 
                m.getPurchasePrice(), 
                m.getIsActive(), 
                m.getCreatedAt(), 
                m.getUpdatedAt()
        );
    }
}
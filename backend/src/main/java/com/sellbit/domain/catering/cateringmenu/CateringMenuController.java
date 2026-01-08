package com.sellbit.domain.catering.cateringmenu;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/catering/catering-menus")
@RequiredArgsConstructor
public class CateringMenuController {

    private final CateringMenuService menuService;

    // --- ENDPOINT-URI PENTRU ADMIN (GESTIUNE) ---

    @PostMapping("/manage")
    public ResponseEntity<CateringMenuDTOs.MenuFullResponse> create(@Valid @RequestBody CateringMenuDTOs.CreateMenuRequest request) {
        return ResponseEntity.ok(menuService.createMenu(request));
    }

    @GetMapping("/manage/active")
    public ResponseEntity<List<CateringMenuDTOs.MenuFullResponse>> getAllActiveForManagement() {
        return ResponseEntity.ok(menuService.getActiveMenusFull());
    }

    @GetMapping("/manage/inactive")
    public ResponseEntity<List<CateringMenuDTOs.MenuFullResponse>> getArchivedForManagement() {
        return ResponseEntity.ok(menuService.getInactiveMenus());
    }

    @PatchMapping("/manage/{id}/toggle-status")
    public ResponseEntity<CateringMenuDTOs.MenuFullResponse> toggle(@PathVariable Integer id) {
        return ResponseEntity.ok(menuService.toggleStatus(id));
    }

    // --- ENDPOINT-URI PENTRU STAFF (OPERATIONAL) ---

    @GetMapping("/catalog")
    public ResponseEntity<List<CateringMenuDTOs.MenuShortResponse>> getCatalogForOrders() {
        return ResponseEntity.ok(menuService.getActiveMenus());
    }
}
package com.sellbit.domain.catalog.product;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // --- ADMIN ---
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/admin") // Listă completă produse dintr-o categorie (include inactive)
    public ResponseEntity<List<ProductDTO>> getForAdmin(@RequestParam Integer categoryId) {
        return ResponseEntity.ok(productService.getProductsForAdmin(categoryId));
    }
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/admin/search") // Căutare globală în catalog pentru admin
    public ResponseEntity<List<ProductDTO>> searchForAdmin(@RequestParam String query) {
        return ResponseEntity.ok(productService.searchForAdmin(query));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/admin/menus")
    public ResponseEntity<List<ProductDTO>> getMenusForAdmin() {
        return ResponseEntity.ok(productService.getMenusForAdmin());
    }

    // --- POS (VÂNZARE) ---
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/pos") // Listă produse active pentru vânzare în categoria selectată
    public ResponseEntity<List<ProductDTO>> getForPos(@RequestParam Integer categoryId) {
        return ResponseEntity.ok(productService.getProductsForPos(categoryId));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/pos/search") // Căutare rapidă produse active după nume pentru casier
    public ResponseEntity<List<ProductDTO>> searchForPos(@RequestParam String query) {
        return ResponseEntity.ok(productService.searchForPos(query));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/pos/barcode/{barcode}") // Identificare produs activ prin scanare cod bare
    public ResponseEntity<ProductDTO> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(productService.getProductByBarcode(barcode));
    }

    // --- OPERAȚIUNI (WRITE/UPDATE) ---
    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping // Adăugare produs nou în catalog
    public ResponseEntity<ProductDTO> create(@Valid @RequestBody ProductDTO dto) {
        return ResponseEntity.ok(productService.createProduct(dto));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}") // Actualizare date produs existent
    public ResponseEntity<ProductDTO> update(@PathVariable Integer id, @Valid @RequestBody ProductDTO dto) {
        return ResponseEntity.ok(productService.updateProduct(id, dto));
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PatchMapping("/{id}/move") // Mutare produs într-o altă categorie frunză
    public ResponseEntity<Void> move(@PathVariable Integer id, @RequestParam Integer newCategoryId) {
        productService.moveProduct(id, newCategoryId);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('100')")
    @PatchMapping("/{id}/status") // Activare sau dezactivare produs pentru vânzare
    public ResponseEntity<Void> toggleStatus(@PathVariable Integer id, @RequestParam boolean active) {
        productService.toggleStatus(id, active);
        return ResponseEntity.noContent().build();
    }
}
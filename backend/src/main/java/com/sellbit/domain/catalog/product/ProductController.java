package com.sellbit.domain.catalog.product;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // --- ADMIN ---

    @GetMapping("/admin")
    public ResponseEntity<List<ProductDTO>> getForAdmin(@RequestParam Integer categoryId) {
        return ResponseEntity.ok(productService.getProductsForAdmin(categoryId));
    }

    @GetMapping("/admin/search")
    public ResponseEntity<List<ProductDTO>> searchForAdmin(@RequestParam String query) {
        return ResponseEntity.ok(productService.searchForAdmin(query));
    }

    // --- POS (VÂNZARE) ---

    @GetMapping("/pos")
    public ResponseEntity<List<ProductDTO>> getForPos(@RequestParam Integer categoryId) {
        return ResponseEntity.ok(productService.getProductsForPos(categoryId));
    }

    @GetMapping("/pos/search")
    public ResponseEntity<List<ProductDTO>> searchForPos(@RequestParam String query) {
        return ResponseEntity.ok(productService.searchForPos(query));
    }

    @GetMapping("/pos/barcode/{barcode}")
    public ResponseEntity<ProductDTO> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(productService.getProductByBarcode(barcode));
    }

    // --- OPERAȚIUNI (WRITE/UPDATE) ---

    @PostMapping
    public ResponseEntity<ProductDTO> create(@Valid @RequestBody ProductDTO dto) {
        return ResponseEntity.ok(productService.createProduct(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> update(@PathVariable Integer id, @Valid @RequestBody ProductDTO dto) {
        return ResponseEntity.ok(productService.updateProduct(id, dto));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> move(@PathVariable Integer id, @RequestParam Integer newCategoryId) {
        productService.moveProduct(id, newCategoryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> toggleStatus(@PathVariable Integer id, @RequestParam boolean active) {
        productService.toggleStatus(id, active);
        return ResponseEntity.noContent().build();
    }
}
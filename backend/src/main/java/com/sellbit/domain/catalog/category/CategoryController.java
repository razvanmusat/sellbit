package com.sellbit.domain.catalog.category;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/catalog/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * Obține categoriile în funcție de părinte (pentru navigare ierarhică).
     * Dacă parentId lipsește, returnează categoriile rădăcină.
     */
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getCategories(@RequestParam(required = false) Integer parentId) {
        return ResponseEntity.ok(categoryService.getCategoriesByParent(parentId));
    }

    /**
     * Obține doar categoriile finale (frunză) - destinații valide pentru produse.
     * Folosit în React pentru modala de "Mutare Produs".
     */
    @GetMapping("/leaves")
    public ResponseEntity<List<CategoryDTO>> getLeafCategories() {
        return ResponseEntity.ok(categoryService.getLeafCategories());
    }

    /**
     * Obține absolut toate categoriile (listă plată).
     */
    @GetMapping("/all")
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategoriesForAdmin());
    }

    @PostMapping
    public ResponseEntity<CategoryDTO> create(@Valid @RequestBody CategoryDTO dto) {
        return ResponseEntity.ok(categoryService.createCategory(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> update(@PathVariable Integer id, @Valid @RequestBody CategoryDTO dto) {
        return ResponseEntity.ok(categoryService.updateCategory(id, dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> toggleStatus(@PathVariable Integer id, @RequestParam boolean active) {
        categoryService.toggleStatus(id, active);
        return ResponseEntity.noContent().build();
    }
}
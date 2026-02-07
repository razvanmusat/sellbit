package com.sellbit.domain.catalog.category;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/catalog/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * Endpoint principal pentru navigare ierarhică (Admin & POS).
     * Pentru Admin (100): Returnează tot (active + inactive).
     * Pentru POS (50, 100): Returnează doar cele active.
     * Dacă parentId lipsește, returnează categoriile rădăcină.
     */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getCategories(@RequestParam(required = false) Integer parentId) {
        // Logica ierarhică activă pentru vânzare/navigare generală
        return ResponseEntity.ok(categoryService.getActiveCategoriesByParent(parentId));
    }

    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id));
    }

    /**
     * Obține categoriile în funcție de părinte pentru interfața de Admin.
     * Include și categoriile inactive.
     */
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/admin/tree")
    public ResponseEntity<List<CategoryDTO>> getCategoriesForAdmin(@RequestParam(required = false) Integer parentId) {
        return ResponseEntity.ok(categoryService.getCategoriesByParent(parentId));
    }

    /**
     * Obține doar categoriile finale (frunză) - destinații valide pentru produse.
     * Folosit în React pentru modala de "Mutare Produs".
     */
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/leaves")
    public ResponseEntity<List<CategoryDTO>> getLeafCategories() {
        return ResponseEntity.ok(categoryService.getLeafCategories());
    }

    /**
     * Obține absolut toate categoriile sub formă de listă plată pentru Admin.
     */
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/all")
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllCategoriesForAdmin());
    }

    /**
     * Creează o categorie nouă.
     */
    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping
    public ResponseEntity<CategoryDTO> create(@Valid @RequestBody CategoryDTO dto) {
        return ResponseEntity.ok(categoryService.createCategory(dto));
    }

    /**
     * Actualizează datele unei categorii existente.
     */
    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> update(@PathVariable Integer id, @Valid @RequestBody CategoryDTO dto) {
        return ResponseEntity.ok(categoryService.updateCategory(id, dto));
    }

    /**
     * Activează sau dezactivează o categorie.
     */
    @PreAuthorize("hasAnyAuthority('100')")
    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> toggleStatus(@PathVariable Integer id, @RequestParam boolean active) {
        categoryService.toggleStatus(id, active);
        return ResponseEntity.noContent().build();
    }
}
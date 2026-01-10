package com.sellbit.domain.catalog.productcomposite;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/catalog/product_components")
@RequiredArgsConstructor
public class ProductCompositeController {

    private final ProductCompositeService compositeService;

    /**
     * Obține configurația activă a unui meniu
     */
    @GetMapping("/parent/{parentId}/active")
    public ResponseEntity<List<ProductCompositeDTOs.CompositionResponse>> getActive(
            @PathVariable Integer parentId) {
        return ResponseEntity.ok(compositeService.getActiveComponents(parentId));
    }

    /**
     * Obține istoricul configurațiilor (inactive)
     */
    @GetMapping("/parent/{parentId}/inactive")
    public ResponseEntity<List<ProductCompositeDTOs.CompositionResponse>> getInactive(
            @PathVariable Integer parentId) {
        return ResponseEntity.ok(compositeService.getInactiveComponents(parentId));
    }

    /**
     * Creează o configurație nouă pentru un produs/meniu
     */
    @PostMapping
    public ResponseEntity<Void> create(@Valid @RequestBody ProductCompositeDTOs.SaveCompositionRequest request) {
        compositeService.createComposition(request);
        return ResponseEntity.status(201).build();
    }

    /**
     * Actualizează configurația (Soft Delete pe vechile componente + Insert noi)
     */
    @PutMapping
    public ResponseEntity<Void> update(@Valid @RequestBody ProductCompositeDTOs.SaveCompositionRequest request) {
        compositeService.updateComposition(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Ștergere logică a întregului rețetar pentru un părinte
     */
    @DeleteMapping("/parent/{parentId}")
    public ResponseEntity<Void> delete(@PathVariable Integer parentId) {
        compositeService.softDeleteComposition(parentId);
        return ResponseEntity.noContent().build();
    }
}
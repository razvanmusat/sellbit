package com.sellbit.domain.catalog.productcomposite;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/catalog/product-components")
@RequiredArgsConstructor
public class ProductCompositeController {

    private final ProductCompositeService compositeService;
    
    //Obține configurația activă a unui meniu
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/parent/{parentId}/active")
    public ResponseEntity<List<ProductCompositeDTOs.CompositionResponse>> getActive(
            @PathVariable Integer parentId) {
        return ResponseEntity.ok(compositeService.getActiveComponents(parentId));
    }
    
    //Obține istoricul configurațiilor (inactive)
    @PreAuthorize("hasAnyAuthority('100')")
    @GetMapping("/parent/{parentId}/inactive")
    public ResponseEntity<List<ProductCompositeDTOs.CompositionResponse>> getInactive(
            @PathVariable Integer parentId) {
        return ResponseEntity.ok(compositeService.getInactiveComponents(parentId));
    }
    
    //Creează o configurație nouă pentru un produs/meniu
    @PreAuthorize("hasAnyAuthority('100')")
    @PostMapping
    public ResponseEntity<Void> create(@Valid @RequestBody ProductCompositeDTOs.SaveCompositionRequest request) {
        compositeService.createComposition(request);
        return ResponseEntity.status(201).build();
    }    

    //Actualizează configurația (Soft Delete pe vechile componente + Insert noi)
    @PreAuthorize("hasAnyAuthority('100')")
    @PutMapping
    public ResponseEntity<Void> update(@Valid @RequestBody ProductCompositeDTOs.SaveCompositionRequest request) {
        compositeService.updateComposition(request);
        return ResponseEntity.ok().build();
    }
    
    //Ștergere logică a întregului rețetar pentru un părinte
    @PreAuthorize("hasAnyAuthority('100')")
    @DeleteMapping("/parent/{parentId}")
    public ResponseEntity<Void> delete(@PathVariable Integer parentId) {
        compositeService.softDeleteComposition(parentId);
        return ResponseEntity.noContent().build();
    }
}
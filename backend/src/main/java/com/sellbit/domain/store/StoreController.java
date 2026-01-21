package com.sellbit.domain.store;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    /* Endpoint pentru obținerea datelor firmei.
     * ACCES: Oricine este logat (Admin sau Casier).
     * Motiv: Datele firmei sunt necesare pentru tipărirea bonurilor și afișarea în UI. */
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping
    public ResponseEntity<StoreDTOs.Response> getStore() {
        return ResponseEntity.ok(storeService.getStore());
    }
    
    /* Endpoint unic pentru configurare și actualizare (Upsert).
     * Motiv: Modificarea datelor fiscale (CUI, Bancă) */  
    @PreAuthorize("hasAuthority('100')")
    @PostMapping
    public ResponseEntity<StoreDTOs.Response> saveOrUpdateStore(@Valid @RequestBody StoreDTOs.SaveRequest request) {
        return ResponseEntity.ok(storeService.saveOrUpdateStore(request));
    }
    
    /* Endpoint util pentru Frontend (ex: într-un Route Guard)
     * pentru a știi dacă trebuie să redirecționeze userul către Setup-ul inițial. */    
    @PreAuthorize("hasAnyAuthority('50', '100')")
    @GetMapping("/is-configured")
    public ResponseEntity<Boolean> isConfigured() {
        return ResponseEntity.ok(storeService.isConfigured());
    }
}
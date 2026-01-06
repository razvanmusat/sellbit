package com.sellbit.domain.store;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class StoreController {

    private final StoreService storeService;

    /**
     * Endpoint pentru obținerea datelor firmei.
     * Folosit de React pentru a popula formularul de setări sau pentru a afișa datele pe documente.
     */
    @GetMapping
    public ResponseEntity<StoreDTOs.Response> getStore() {
        return ResponseEntity.ok(storeService.getStore());
    }

    /**
     * Endpoint unic pentru configurare și actualizare (Upsert).
     * Adminul trimite datele, iar serverul decide dacă face Insert sau Update.
     */
    @PostMapping
    public ResponseEntity<StoreDTOs.Response> saveOrUpdateStore(@Valid @RequestBody StoreDTOs.SaveRequest request) {
        return ResponseEntity.ok(storeService.saveOrUpdateStore(request));
    }

    /**
     * Endpoint util pentru Frontend (ex: într-un Route Guard) 
     * pentru a știi dacă trebuie să redirecționeze userul către Setup-ul inițial.
     */
    @GetMapping("/is-configured")
    public ResponseEntity<Boolean> isConfigured() {
        return ResponseEntity.ok(storeService.isConfigured());
    }
}
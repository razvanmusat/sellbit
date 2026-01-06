package com.sellbit.domain.store;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;

@Service
@RequiredArgsConstructor
@Validated
public class StoreService {

    private final StoreRepository storeRepository;

    /**
     * Citește setările magazinului.
     */
    @Transactional(readOnly = true)
    public StoreDTOs.Response getStore() {
        return storeRepository.getSettings()
                .map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("ERROR.STORE.NOT_CONFIGURED"));
    }

    /**
     * Salvează sau editează datele firmei.
     * Folosim @Valid pentru a activa validările din Record (NotBlank, Email, etc.)
     */
    @Transactional
    public StoreDTOs.Response saveOrUpdateStore(@Valid StoreDTOs.SaveRequest request) {
        // Căutăm înregistrarea existentă sau pregătim una nouă
        Store store = storeRepository.getSettings()
                .orElse(new Store());

        // Mapăm datele din Request în Entitate
        store.setName(request.name());
        store.setAddress(request.address());
        store.setPhone(request.phone());
        store.setEmail(request.email());
        store.setVatNumber(request.vatNumber());
        store.setRegistrationNumber(request.registrationNumber());
        store.setBankAccount(request.bankAccount());

        // Salvarea va arunca excepții de DB dacă lungimile depășesc varchar-ul, 
        // dar @Valid din Record ar trebui să prindă majoritatea cazurilor înainte.
        return mapToResponse(storeRepository.save(store));
    }

    /**
     * Verificare rapidă pentru fluxul de Setup
     */
    @Transactional(readOnly = true)
    public boolean isConfigured() {
        return storeRepository.isConfigured();
    }

    private StoreDTOs.Response mapToResponse(Store store) {
        return new StoreDTOs.Response(
                store.getId(),
                store.getName(),
                store.getAddress(),
                store.getPhone(),
                store.getEmail(),
                store.getVatNumber(),
                store.getRegistrationNumber(),
                store.getBankAccount(),
                store.getCreatedAt(),
                store.getUpdatedAt()
        );
    }
}
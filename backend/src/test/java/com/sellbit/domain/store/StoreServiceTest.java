package com.sellbit.domain.store;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StoreServiceTest {

    @Mock
    private StoreRepository storeRepository;

    @InjectMocks
    private StoreService storeService;

    // Obiecte refolosibile pentru teste
    private StoreDTOs.SaveRequest validRequest;
    private Store existingStore;

    @BeforeEach
    void setUp() {
        // Inițializăm un Request valid
        validRequest = new StoreDTOs.SaveRequest(
                "SellBit SRL",
                "Str. Libertății nr. 10",
                "0711223344",
                "contact@sellbit.ro",
                "RO123456",
                "J40/123/2024",
                "RO00BTRL000000000"
        );

        // Inițializăm o Entitate existentă (simulată din DB)
        existingStore = Store.builder()
                .id(99) // ID existent
                .name("Old Name SRL")
                .address("Old Address")
                .phone("0000000000")
                .email("old@email.com")
                .vatNumber("RO_OLD")
                .registrationNumber("J_OLD")
                .bankAccount("OLD_IBAN")
                .createdAt(LocalDateTime.now().minusDays(10))
                .updatedAt(LocalDateTime.now().minusDays(1))
                .build();
    }

    // --- TESTE: getStore() ---

    @Test
    @DisplayName("getStore - Returnează datele corect mapate când magazinul există")
    void getStore_Success() {
        // GIVEN
        when(storeRepository.getSettings()).thenReturn(Optional.of(existingStore));

        // WHEN
        StoreDTOs.Response response = storeService.getStore();

        // THEN
        assertNotNull(response);
        assertEquals(99, response.id());
        assertEquals("Old Name SRL", response.name());
        assertEquals("RO_OLD", response.vatNumber());
    }

    @Test
    @DisplayName("getStore - Aruncă eroare dacă magazinul NU este configurat")
    void getStore_ThrowsException_WhenEmpty() {
        // GIVEN
        when(storeRepository.getSettings()).thenReturn(Optional.empty());

        // WHEN & THEN
        RuntimeException ex = assertThrows(RuntimeException.class, () -> storeService.getStore());
        assertEquals("ERROR.STORE.NOT_CONFIGURED", ex.getMessage());
    }

    // --- TESTE: saveOrUpdateStore() ---

    @Test
    @DisplayName("saveOrUpdate - INSERT: Creează o înregistrare nouă dacă tabela e goală")
    void saveOrUpdate_CreateNew() {
        // GIVEN: Repository nu găsește nimic
        when(storeRepository.getSettings()).thenReturn(Optional.empty());
        
        // Mock Save: returnează obiectul salvat cu un ID generat
        when(storeRepository.save(any(Store.class))).thenAnswer(invocation -> {
            Store toSave = invocation.getArgument(0);
            toSave.setId(1); // Simulăm baza de date care pune ID 1
            return toSave;
        });

        // WHEN
        StoreDTOs.Response response = storeService.saveOrUpdateStore(validRequest);

        // THEN
        assertNotNull(response.id());
        assertEquals(1, response.id());
        assertEquals("SellBit SRL", response.name());
        assertEquals("RO123456", response.vatNumber());
        
        // Verificăm că s-a apelat save pe repository
        verify(storeRepository).save(any(Store.class));
    }

    @Test
    @DisplayName("saveOrUpdate - UPDATE: Actualizează înregistrarea existentă fără a schimba ID-ul")
    void saveOrUpdate_UpdateExisting() {
        // GIVEN: Repository găsește firma veche (ID 99)
        when(storeRepository.getSettings()).thenReturn(Optional.of(existingStore));
        
        // Mock Save: returnează entitatea modificată
        when(storeRepository.save(any(Store.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // WHEN
        StoreDTOs.Response response = storeService.saveOrUpdateStore(validRequest);

        // THEN
        assertEquals(99, response.id(), "ID-ul trebuie să rămână 99, nu să se creeze altul nou");
        assertEquals("SellBit SRL", response.name(), "Numele trebuie să fie cel nou");
        assertEquals("RO123456", response.vatNumber(), "CUI-ul trebuie actualizat");
        
        // Verificăm că s-a actualizat obiectul 'existingStore'
        assertEquals("contact@sellbit.ro", existingStore.getEmail());
    }

    @Test
    @DisplayName("saveOrUpdate - Mapping: Toate câmpurile sunt transferate corect din DTO în Entity")
    void saveOrUpdate_CheckAllFieldsMapping() {
        // GIVEN
        when(storeRepository.getSettings()).thenReturn(Optional.empty());
        when(storeRepository.save(any(Store.class))).thenAnswer(i -> i.getArgument(0));

        // WHEN
        StoreDTOs.Response response = storeService.saveOrUpdateStore(validRequest);

        // THEN: Verificăm absolut toate câmpurile
        assertAll("Verificare mapare câmpuri",
            () -> assertEquals(validRequest.name(), response.name()),
            () -> assertEquals(validRequest.address(), response.address()),
            () -> assertEquals(validRequest.phone(), response.phone()),
            () -> assertEquals(validRequest.email(), response.email()),
            () -> assertEquals(validRequest.vatNumber(), response.vatNumber()),
            () -> assertEquals(validRequest.registrationNumber(), response.registrationNumber()),
            () -> assertEquals(validRequest.bankAccount(), response.bankAccount())
        );
    }

    // --- TESTE: isConfigured() ---

    @Test
    @DisplayName("isConfigured - Returnează TRUE dacă repository zice true")
    void isConfigured_True() {
        when(storeRepository.isConfigured()).thenReturn(true);
        assertTrue(storeService.isConfigured());
    }

    @Test
    @DisplayName("isConfigured - Returnează FALSE dacă repository zice false")
    void isConfigured_False() {
        when(storeRepository.isConfigured()).thenReturn(false);
        assertFalse(storeService.isConfigured());
    }
}
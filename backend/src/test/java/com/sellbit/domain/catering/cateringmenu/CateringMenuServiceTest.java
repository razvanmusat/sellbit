package com.sellbit.domain.catering.cateringmenu;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CateringMenuServiceTest {

    @Mock
    private CateringMenuRepository menuRepository;

    @InjectMocks
    private CateringMenuService menuService;

    // --- TESTE createMenu ---

    @Test
    @DisplayName("createMenu: Ar trebui să salveze și să returneze meniul când datele sunt valide")
    void createMenu_ValidRequest_ReturnsResponse() {
        // Arrange
        var req = new CateringMenuDTOs.CreateMenuRequest("Pizza", new BigDecimal("45.00"), true);
        var savedEntity = CateringMenu.builder()
                .id(1)
                .name("Pizza")
                .purchasePrice(new BigDecimal("45.00"))
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .build();

        when(menuRepository.save(any(CateringMenu.class))).thenReturn(savedEntity);

        // Act
        var result = menuService.createMenu(req);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.id());
        assertEquals("Pizza", result.name());
        verify(menuRepository, times(1)).save(any(CateringMenu.class));
    }

    @Test
    @DisplayName("createMenu: Ar trebui să seteze isActive pe true implicit dacă req.isActive() este null")
    void createMenu_NullActiveInRequest_SetsDefaultTrue() {
        // Arrange
        var req = new CateringMenuDTOs.CreateMenuRequest("Burger", new BigDecimal("35.00"), null);
        ArgumentCaptor<CateringMenu> captor = ArgumentCaptor.forClass(CateringMenu.class);

        when(menuRepository.save(any(CateringMenu.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        menuService.createMenu(req);

        // Assert
        verify(menuRepository).save(captor.capture());
        assertTrue(captor.getValue().getIsActive());
    }

    // --- TESTE toggleStatus ---

    @Test
    @DisplayName("toggleStatus: Ar trebui să schimbe statusul din true în false")
    void toggleStatus_FromActiveToInactive_ReturnsResponse() {
        // Arrange
        var existing = CateringMenu.builder().id(1).isActive(true).build();
        when(menuRepository.findById(1)).thenReturn(Optional.of(existing));

        // Act
        var result = menuService.toggleStatus(1);

        // Assert
        assertFalse(result.isActive());
        verify(menuRepository).findById(1);
    }

    @Test
    @DisplayName("toggleStatus: Ar trebui să arunce excepție dacă ID-ul nu există")
    void toggleStatus_NotFound_ThrowsRuntimeException() {
        // Arrange
        when(menuRepository.findById(99)).thenReturn(Optional.empty());

        // Act & Assert
        RuntimeException ex = assertThrows(RuntimeException.class, () -> menuService.toggleStatus(99));
        assertEquals("Catering menu not found with id: 99", ex.getMessage());
    }

    // --- TESTE getActiveMenusFull ---

    @Test
    @DisplayName("getActiveMenusFull: Ar trebui să returneze lista completă de meniuri active")
    void getActiveMenusFull_ReturnsList() {
        // Arrange
        var list = List.of(
                CateringMenu.builder().id(1).name("A").isActive(true).build(),
                CateringMenu.builder().id(2).name("B").isActive(true).build()
        );
        when(menuRepository.findByIsActiveTrueOrderByNameAsc()).thenReturn(list);

        // Act
        var result = menuService.getActiveMenusFull();

        // Assert
        assertEquals(2, result.size());
        assertEquals("A", result.get(0).name());
        verify(menuRepository).findByIsActiveTrueOrderByNameAsc();
    }

    // --- TESTE getInactiveMenus ---

    @Test
    @DisplayName("getInactiveMenus: Ar trebui să returneze meniurile arhivate")
    void getInactiveMenus_ReturnsList() {
        // Arrange
        var list = List.of(CateringMenu.builder().id(3).name("C").isActive(false).build());
        when(menuRepository.findByIsActiveFalseOrderByNameAsc()).thenReturn(list);

        // Act
        var result = menuService.getInactiveMenus();

        // Assert
        assertEquals(1, result.size());
        assertFalse(result.get(0).isActive());
    }

    // --- TESTE getActiveMenus (Short Response) ---

    @Test
    @DisplayName("getActiveMenus: Ar trebui să returneze doar ID și Nume pentru staff")
    void getActiveMenus_ShortResponse_ReturnsList() {
        // Arrange
        var list = List.of(CateringMenu.builder().id(1).name("Pizza").purchasePrice(new BigDecimal("50")).build());
        when(menuRepository.findByIsActiveTrueOrderByNameAsc()).thenReturn(list);

        // Act
        var result = menuService.getActiveMenus();

        // Assert
        assertEquals(1, result.size());
        assertEquals("Pizza", result.get(0).name());
        // Verificăm indirect că e ShortResponse prin tipul returnat (lipsa prețului în obiectul de răspuns)
        assertInstanceOf(CateringMenuDTOs.MenuShortResponse.class, result.get(0));
    }
}
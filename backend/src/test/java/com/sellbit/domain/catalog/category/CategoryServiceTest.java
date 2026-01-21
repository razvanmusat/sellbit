package com.sellbit.domain.catalog.category;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private CategoryService categoryService;

    private CategoryDTO categoryDTO;
    private Category rootCategory;

    @BeforeEach
    void setUp() {
        categoryDTO = new CategoryDTO(null, "TEST_CODE", "Test Label", null, true, false, null, null);

        rootCategory = new Category();
        rootCategory.setId(1);
        rootCategory.setCode("ROOT");
        rootCategory.setLabel("Root Category");
        rootCategory.setIsActive(true);
        rootCategory.setCreatedAt(LocalDateTime.now());
        rootCategory.setUpdatedAt(LocalDateTime.now());
    }

    // --- CREATE ---

    @Test
    void createCategory_ShouldThrowException_WhenCodeExists() {
        when(categoryRepository.existsByCode("TEST_CODE")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.createCategory(categoryDTO)
        );

        assertEquals("ERROR.CATEGORY.DUPLICATE_CODE", ex.getMessage());
        verify(categoryRepository, never()).save(any());
    }

    @Test
    void createCategory_ShouldSaveRoot_WhenDataIsValid() {
        when(categoryRepository.existsByCode(anyString())).thenReturn(false);
        // Acest stub este necesar aici deoarece createCategory apelează convertToDTO(entity) care verifică copiii
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(any())).thenReturn(false);
        
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> {
            Category c = i.getArgument(0);
            c.setId(100);
            return c;
        });

        CategoryDTO saved = categoryService.createCategory(categoryDTO);

        assertNotNull(saved.id());
        assertEquals("TEST_CODE", saved.code());
        assertFalse(saved.hasChildren());
        verify(categoryRepository, times(1)).save(any());
    }

    @Test
    void createCategory_ShouldThrowException_WhenParentNotFound() {
        CategoryDTO dtoWithParent = new CategoryDTO(null, "SUB", "Sub", 99, true, false, null, null);

        when(categoryRepository.existsByCode("SUB")).thenReturn(false);
        when(categoryRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.createCategory(dtoWithParent)
        );

        assertEquals("ERROR.CATEGORY.PARENT_NOT_FOUND", ex.getMessage());
    }

    // --- TOGGLE STATUS ---

    @Test
    void toggleStatus_ShouldChangeActiveFlag() {
        Category existing = new Category();
        existing.setId(1);
        existing.setIsActive(true);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));

        categoryService.toggleStatus(1, false);

        assertFalse(existing.getIsActive());
        verify(categoryRepository).save(existing);
    }

    // --- UPDATE ---

    @Test
    void updateCategory_ShouldUpdateLabelAndCode() {
        Category existing = new Category();
        existing.setId(1);
        existing.setCode("OLD");
        existing.setLabel("Old Label");

        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByCode("NEW")).thenReturn(false);
        // Stub necesar pentru că updateCategory returnează DTO convertit dinamic
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(1)).thenReturn(true);
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        CategoryDTO dto = new CategoryDTO(null, "NEW", "New Label", null, true, true, null, null);

        CategoryDTO updated = categoryService.updateCategory(1, dto);

        assertEquals("NEW", updated.code());
        assertEquals("New Label", updated.label());
        assertTrue(updated.hasChildren());
        verify(categoryRepository).save(existing);
    }

    // --- GET ACTIVE BY PARENT ---

    @Test
    void getActiveCategoriesByParent_ShouldCallCorrectRepoMethods() {
        when(categoryRepository.findByParentIsNullAndIsActiveTrueOrderByLabelAsc())
                .thenReturn(List.of(rootCategory));
        // Stub necesar
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(1)).thenReturn(false);

        List<CategoryDTO> results = categoryService.getActiveCategoriesByParent(null);

        assertEquals(1, results.size());
        verify(categoryRepository).findByParentIsNullAndIsActiveTrueOrderByLabelAsc();
    }

    // --- GET LEAVES ---

    @Test
    void getLeafCategories_ShouldReturnLeafList() {
        Category leaf1 = new Category();
        leaf1.setId(10);
        leaf1.setLabel("Leaf 1");

        when(categoryRepository.findLeafCategories()).thenReturn(Arrays.asList(leaf1));
        
        // CORECTAT: Am șters stub-ul pentru existsByParent_IdAndIsActiveTrue
        // Motiv: Serviciul apelează convertToDTO(c, false), deci nu verifică repository-ul.

        List<CategoryDTO> leaves = categoryService.getLeafCategories();

        assertEquals(1, leaves.size());
        assertEquals(10, leaves.get(0).id());
    }

    // --- GET BY PARENT ---

    @Test
    void getCategoriesByParent_ShouldReturnRoot_WhenParentNull() {
        when(categoryRepository.findByParentIsNullOrderByLabelAsc()).thenReturn(List.of(rootCategory));
        // Stub necesar
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(1)).thenReturn(false);

        List<CategoryDTO> categories = categoryService.getCategoriesByParent(null);

        assertEquals(1, categories.size());
        assertNull(categories.get(0).parentId());
    }

    @Test
    void getCategoriesByParent_ShouldReturnByParentId() {
        Category child = new Category();
        child.setId(2);
        child.setParent(rootCategory);

        when(categoryRepository.findByParentIdOrderByLabelAsc(1)).thenReturn(List.of(child));
        // Stub necesar
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(2)).thenReturn(false);

        List<CategoryDTO> categories = categoryService.getCategoriesByParent(1);

        assertEquals(1, categories.size());
        assertEquals(1, categories.get(0).parentId());
    }
}
package com.sellbit.domain.catalog.category;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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
        categoryDTO = new CategoryDTO(null, "TEST_CODE", "Test Label", null, true, null, null);

        rootCategory = new Category();
        rootCategory.setId(1);
        rootCategory.setCode("ROOT");
        rootCategory.setLabel("Root Category");
        rootCategory.setIsActive(true);
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
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> {
            Category c = i.getArgument(0);
            c.setId(100);
            return c;
        });

        CategoryDTO saved = categoryService.createCategory(categoryDTO);

        assertNotNull(saved.id());
        assertEquals("TEST_CODE", saved.code());
        verify(categoryRepository, times(1)).save(any());
    }

    @Test
    void createCategory_ShouldThrowException_WhenParentNotFound() {
        CategoryDTO dtoWithParent = new CategoryDTO(null, "SUB", "Sub", 99, true, null, null);

        when(categoryRepository.existsByCode("SUB")).thenReturn(false);
        when(categoryRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.createCategory(dtoWithParent)
        );

        assertEquals("ERROR.CATEGORY.PARENT_NOT_FOUND", ex.getMessage());
    }

    @Test
    void createCategory_ShouldSaveSubcategory_WhenParentExists() {
        CategoryDTO dtoWithParent = new CategoryDTO(null, "SUB", "Sub", 1, true, null, null);

        when(categoryRepository.existsByCode("SUB")).thenReturn(false);
        when(categoryRepository.findById(1)).thenReturn(Optional.of(rootCategory));
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> {
            Category c = i.getArgument(0);
            c.setId(200);
            return c;
        });

        CategoryDTO saved = categoryService.createCategory(dtoWithParent);

        assertNotNull(saved.id());
        assertEquals(1, saved.parentId());
        verify(categoryRepository, times(1)).save(any());
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

    @Test
    void toggleStatus_ShouldThrow_WhenCategoryNotFound() {
        when(categoryRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.toggleStatus(99, false)
        );

        assertEquals("ERROR.CATEGORY.NOT_FOUND", ex.getMessage());
    }

    // --- UPDATE ---

    @Test
    void updateCategory_ShouldThrow_WhenParentImmutable() {
        Category existing = new Category();
        existing.setId(1);
        existing.setCode("OLD");
        existing.setLabel("Old Label");
        existing.setParent(rootCategory);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));

        CategoryDTO dto = new CategoryDTO(null, "OLD", "New Label", 99, true, null, null);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.updateCategory(1, dto)
        );

        assertEquals("ERROR.CATEGORY.PARENT_IMMUTABLE", ex.getMessage());
    }

    @Test
    void updateCategory_ShouldThrow_WhenDuplicateCode() {
        Category existing = new Category();
        existing.setId(1);
        existing.setCode("OLD");
        existing.setLabel("Old Label");

        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByCode("NEW")).thenReturn(true);

        CategoryDTO dto = new CategoryDTO(null, "NEW", "New Label", null, true, null, null);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.updateCategory(1, dto)
        );

        assertEquals("ERROR.CATEGORY.DUPLICATE_CODE", ex.getMessage());
    }

    @Test
    void updateCategory_ShouldUpdateLabelAndCode() {
        Category existing = new Category();
        existing.setId(1);
        existing.setCode("OLD");
        existing.setLabel("Old Label");

        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));
        when(categoryRepository.existsByCode("NEW")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenAnswer(i -> i.getArgument(0));

        CategoryDTO dto = new CategoryDTO(null, "NEW", "New Label", null, true, null, null);

        CategoryDTO updated = categoryService.updateCategory(1, dto);

        assertEquals("NEW", updated.code());
        assertEquals("New Label", updated.label());
        verify(categoryRepository).save(existing);
    }

    // --- GET LEAVES ---

    @Test
    void getLeafCategories_ShouldReturnLeafList() {
        Category leaf1 = new Category();
        leaf1.setId(10);
        leaf1.setLabel("Leaf 1");

        Category leaf2 = new Category();
        leaf2.setId(20);
        leaf2.setLabel("Leaf 2");

        when(categoryRepository.findLeafCategories()).thenReturn(Arrays.asList(leaf1, leaf2));

        List<CategoryDTO> leaves = categoryService.getLeafCategories();

        assertEquals(2, leaves.size());
        assertTrue(leaves.stream().anyMatch(c -> c.id() == 10));
    }

    // --- GET BY PARENT ---

    @Test
    void getCategoriesByParent_ShouldReturnRoot_WhenParentNull() {
        when(categoryRepository.findByParentIsNullOrderByLabelAsc()).thenReturn(List.of(rootCategory));

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

        List<CategoryDTO> categories = categoryService.getCategoriesByParent(1);

        assertEquals(1, categories.size());
        assertEquals(1, categories.get(0).parentId());
    }
}

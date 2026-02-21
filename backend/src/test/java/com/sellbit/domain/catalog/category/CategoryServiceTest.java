package com.sellbit.domain.catalog.category;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    
    @Mock
    private ProductRepository productRepository;

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
    @DisplayName("createCategory - Eroare: Codul categoriei exista deja (duplicate code)")
    void createCategory_ShouldThrowException_WhenCodeExists() {
        when(categoryRepository.existsByCode("TEST_CODE")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                categoryService.createCategory(categoryDTO)
        );

        assertEquals("ERROR.CATEGORY.DUPLICATE_CODE", ex.getMessage());
        verify(categoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("createCategory - Succes: Salveaza categorie radacina valida")
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
    @DisplayName("createCategory - Eroare: Parintele nu exista")
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
    @DisplayName("toggleStatus - Succes: Inverseaza status-ul categoriei")
    void toggleStatus_ShouldChangeActiveFlag() {
        Category existing = new Category();
        existing.setId(1);
        existing.setIsActive(true);

        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));
        when(categoryRepository.findByParentIdOrderByLabelAsc(1)).thenReturn(Collections.emptyList());
        when(productRepository.findByCategoryId(1)).thenReturn(Collections.emptyList());

        categoryService.toggleStatus(1, false);

        assertFalse(existing.getIsActive());
        verify(categoryRepository).save(existing);
    }

    // --- UPDATE ---

    @Test
    @DisplayName("updateCategory - Succes: Actualizeaza label si code")
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
    @DisplayName("getActiveCategoriesByParent - Succes: Returneaza categorii active radacina")
    void getActiveCategoriesByParent_ShouldCallCorrectRepoMethods() {
        when(categoryRepository.findByParentIsNullAndIsActiveTrueOrderByLabelAsc())
                .thenReturn(List.of(rootCategory));
        when(categoryRepository.countActiveChildrenByParentIds(anyList())).thenReturn(Collections.emptyList());

        List<CategoryDTO> results = categoryService.getActiveCategoriesByParent(null);

        assertEquals(1, results.size());
        verify(categoryRepository).findByParentIsNullAndIsActiveTrueOrderByLabelAsc();
    }

    // --- GET LEAVES ---

    @Test
    @DisplayName("getLeafCategories - Succes: Returneaza categorii frunza")
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
    @DisplayName("getCategoriesByParent - Succes: Returneaza radacina cand parent este null")
    void getCategoriesByParent_ShouldReturnRoot_WhenParentNull() {
        when(categoryRepository.findByParentIsNullOrderByLabelAsc()).thenReturn(List.of(rootCategory));
        when(categoryRepository.countActiveChildrenByParentIds(anyList())).thenReturn(Collections.emptyList());

        List<CategoryDTO> categories = categoryService.getCategoriesByParent(null);

        assertEquals(1, categories.size());
        assertNull(categories.get(0).parentId());
    }

    @Test
    @DisplayName("getCategoriesByParent - Succes: Returneaza categorii dupa parent id")
    void getCategoriesByParent_ShouldReturnByParentId() {
        Category child = new Category();
        child.setId(2);
        child.setParent(rootCategory);

        when(categoryRepository.findByParentIdOrderByLabelAsc(1)).thenReturn(List.of(child));
        when(categoryRepository.countActiveChildrenByParentIds(anyList())).thenReturn(Collections.emptyList());

        List<CategoryDTO> categories = categoryService.getCategoriesByParent(1);

        assertEquals(1, categories.size());
        assertEquals(1, categories.get(0).parentId());
    }

    // --- ADDITIONAL TESTS ---

    @Test
    @DisplayName("toggleStatus - Succes: Dezactiveaza recursiv subcategorii si produse")
    void toggleStatus_ShouldPropagateRecursively() {
        // Categorie parinte
        Category parent = new Category();
        parent.setId(1);
        parent.setIsActive(true);
        
        // Subcategorie
        Category child = new Category();
        child.setId(2);
        child.setIsActive(true);
        child.setParent(parent);
        
        // Produs in parinte
        Product product1 = new Product();
        product1.setId(1);
        product1.setIsActive(true);
        
        when(categoryRepository.findById(1)).thenReturn(Optional.of(parent));
        when(categoryRepository.findByParentIdOrderByLabelAsc(1)).thenReturn(List.of(child));
        when(categoryRepository.findByParentIdOrderByLabelAsc(2)).thenReturn(Collections.emptyList());
        when(productRepository.findByCategoryId(1)).thenReturn(List.of(product1));
        when(productRepository.findByCategoryId(2)).thenReturn(Collections.emptyList());
        
        categoryService.toggleStatus(1, false);
        
        assertFalse(parent.getIsActive());
        assertFalse(child.getIsActive());
        assertFalse(product1.getIsActive());
    }

    @Test
    @DisplayName("toggleStatus - Eroare: Nu se poate activa daca parintele e inactiv")
    void toggleStatus_ShouldThrowException_WhenParentInactive() {
        Category parent = new Category();
        parent.setId(1);
        parent.setIsActive(false);
        
        Category child = new Category();
        child.setId(2);
        child.setIsActive(false);
        child.setParent(parent);
        
        when(categoryRepository.findById(2)).thenReturn(Optional.of(child));
        
        RuntimeException ex = assertThrows(RuntimeException.class, 
            () -> categoryService.toggleStatus(2, true));
        assertEquals("ERROR.CATEGORY.PARENT_INACTIVE", ex.getMessage());
    }

    @Test
    @DisplayName("updateCategory - Eroare: Parent nu poate fi schimbat")
    void updateCategory_ShouldThrowException_WhenParentChanged() {
        Category parent1 = new Category();
        parent1.setId(5);
        
        Category existing = new Category();
        existing.setId(1);
        existing.setCode("TEST");
        existing.setLabel("Test");
        existing.setParent(parent1);
        
        when(categoryRepository.findById(1)).thenReturn(Optional.of(existing));
        
        CategoryDTO dtoWithDifferentParent = new CategoryDTO(1, "TEST", "Test", 10, true, false, null, null);
        
        RuntimeException ex = assertThrows(RuntimeException.class, 
            () -> categoryService.updateCategory(1, dtoWithDifferentParent));
        assertEquals("ERROR.CATEGORY.PARENT_IMMUTABLE", ex.getMessage());
    }

    @Test
    @DisplayName("getCategoriesByParent - Succes: Returneaza lista goala")
    void getCategoriesByParent_ShouldReturnEmpty_WhenNoCategories() {
        when(categoryRepository.findByParentIsNullOrderByLabelAsc()).thenReturn(Collections.emptyList());
        
        List<CategoryDTO> categories = categoryService.getCategoriesByParent(null);
        
        assertTrue(categories.isEmpty());
    }

    @Test
    @DisplayName("createCategory - Succes: Salveaza categorie cu parent valid")
    void createCategory_WithValidParent() {
        // GIVEN
        Category mockParent = new Category();
        mockParent.setId(1);
        
        CategoryDTO dto = new CategoryDTO(null, "CHILD", "Child", 1, true, false, null, null);
        when(categoryRepository.existsByCode("CHILD")).thenReturn(false);
        when(categoryRepository.findById(1)).thenReturn(Optional.of(mockParent));
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(any())).thenReturn(false);
        when(categoryRepository.save(any())).thenAnswer(i -> {
            Category c = i.getArgument(0);
            c.setId(100);
            return c;
        });
        
        // WHEN
        CategoryDTO saved = categoryService.createCategory(dto);
        
        // THEN
        assertNotNull(saved.id());
        assertEquals(1, saved.parentId());
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("getCategoryById - Succes: Returneaza categoria cu ID valid")
    void getCategoryById_ShouldReturnCategory() {
        when(categoryRepository.findById(1)).thenReturn(Optional.of(rootCategory));
        when(categoryRepository.existsByParent_IdAndIsActiveTrue(1)).thenReturn(false);
        
        CategoryDTO result = categoryService.getCategoryById(1);
        
        assertNotNull(result);
        assertEquals("ROOT", result.code());
    }

    @Test
    @DisplayName("getCategoryById - Eroare: Categoria nu exista (EntityNotFoundException)")
    void getCategoryById_ShouldThrowException_WhenNotFound() {
        when(categoryRepository.findById(999)).thenReturn(Optional.empty());
        
        assertThrows(EntityNotFoundException.class, () -> categoryService.getCategoryById(999));
    }

    @Test
    @DisplayName("getAllCategoriesForAdmin - Succes: Returneaza toate categoriile")
    void getAllCategoriesForAdmin_ShouldReturnAllCategories() {
        when(categoryRepository.findAllByOrderByLabelAsc()).thenReturn(List.of(rootCategory));
        when(categoryRepository.countActiveChildrenByParentIds(anyList())).thenReturn(Collections.emptyList());
        
        List<CategoryDTO> result = categoryService.getAllCategoriesForAdmin();
        
        assertEquals(1, result.size());
        verify(categoryRepository).findAllByOrderByLabelAsc();
    }

    @Test
    @DisplayName("getActiveCategoriesByParent - Succes: Returneaza categorii active dupa parent id")
    void getActiveCategoriesByParent_ShouldReturnActiveByParentId() {
        Category child = new Category();
        child.setId(2);
        child.setIsActive(true);
        child.setParent(rootCategory);
        
        when(categoryRepository.findByParentIdAndIsActiveTrueOrderByLabelAsc(1))
                .thenReturn(List.of(child));
        when(categoryRepository.countActiveChildrenByParentIds(anyList())).thenReturn(Collections.emptyList());
        
        List<CategoryDTO> results = categoryService.getActiveCategoriesByParent(1);
        
        assertEquals(1, results.size());
        assertEquals(2, results.get(0).id());
        verify(categoryRepository).findByParentIdAndIsActiveTrueOrderByLabelAsc(1);
    }
}
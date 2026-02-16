package com.sellbit.domain.catalog.category;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;

import jakarta.persistence.EntityNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;  

     //Returnează categoriile active filtrat după părinte pentru navigarea ierarhică în POS.     
    @Transactional(readOnly = true)
    public List<CategoryDTO> getActiveCategoriesByParent(Integer parentId) {
        List<Category> categories = (parentId == null) 
            ? categoryRepository.findByParentIsNullAndIsActiveTrueOrderByLabelAsc()
            : categoryRepository.findByParentIdAndIsActiveTrueOrderByLabelAsc(parentId);

        return categories.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public CategoryDTO getCategoryById(Integer id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Category not found with id: " + id));
        return convertToDTO(category);
    }

    @Transactional(readOnly = true)
    public List<CategoryDTO> getAllCategoriesForAdmin() {
        return categoryRepository.findAllByOrderByLabelAsc().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    //Returnează doar categoriile care nu au subcategorii (indiferent de status).    
    @Transactional(readOnly = true)
    public List<CategoryDTO> getLeafCategories() {
        return categoryRepository.findLeafCategories().stream()                
                .map(c -> convertToDTO(c, false)) 
                .collect(Collectors.toList());
    }
    
    //Navigare pentru Admin (include și cele inactive).    
    @Transactional(readOnly = true)
    public List<CategoryDTO> getCategoriesByParent(Integer parentId) {
        List<Category> categories = (parentId == null) 
                ? categoryRepository.findByParentIsNullOrderByLabelAsc()
                : categoryRepository.findByParentIdOrderByLabelAsc(parentId);

        return categories.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryDTO createCategory(CategoryDTO dto) {
        if (categoryRepository.existsByCode(dto.code())) {
            throw new RuntimeException("ERROR.CATEGORY.DUPLICATE_CODE");
        }

        Category category = new Category();
        category.setCode(dto.code());
        category.setLabel(dto.label());
        category.setIsActive(true);

        if (dto.parentId() != null) {
            Category parent = categoryRepository.findById(dto.parentId())
                    .orElseThrow(() -> new RuntimeException("ERROR.CATEGORY.PARENT_NOT_FOUND"));
            category.setParent(parent);
        }

        return convertToDTO(categoryRepository.save(category));
    }

    @Transactional
    public CategoryDTO updateCategory(Integer id, CategoryDTO dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.CATEGORY.NOT_FOUND"));

        if (dto.parentId() != null &&
                !dto.parentId().equals(
                        category.getParent() != null ? category.getParent().getId() : null)) {
            throw new RuntimeException("ERROR.CATEGORY.PARENT_IMMUTABLE");
        }

        if (!category.getCode().equals(dto.code()) && categoryRepository.existsByCode(dto.code())) {
            throw new RuntimeException("ERROR.CATEGORY.DUPLICATE_CODE");
        }

        category.setLabel(dto.label());
        category.setCode(dto.code());

        return convertToDTO(categoryRepository.save(category));
    }

    
    //Dacă Activa/dezactivam o categorie -> Activam/dezactivam recursiv toți copiii și toate produsele din ea.     
    @Transactional
    public void toggleStatus(Integer id, boolean active) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.CATEGORY.NOT_FOUND"));

        // 1. Validare Părinte (Rămâne valabilă): Nu te poți activa dacă tatăl e inactiv
        if (active && category.getParent() != null) {
            if (!category.getParent().getIsActive()) {
                throw new RuntimeException("ERROR.CATEGORY.PARENT_INACTIVE");
            }
        }

        // 2. Setăm statusul categoriei curente
        category.setIsActive(active);
        categoryRepository.save(category);
 
        // - Dezactivare Categorie -> Dezactivează tot sub ea.
        // - Activare Categorie -> Activează tot sub ea.
        propagateStatusRecursively(category, active);
    }

    private void propagateStatusRecursively(Category parent, boolean targetStatus) {
        
        // A. Actualizăm produsele (Optimizat cu saveAll)
        List<Product> products = productRepository.findByCategoryId(parent.getId());
        
        // Filtrăm doar produsele care au status diferit ca să nu facem update inutil
        List<Product> productsToUpdate = products.stream()
            .filter(p -> p.getIsActive() != targetStatus)
            .peek(p -> p.setIsActive(targetStatus))
            .collect(Collectors.toList());

        if (!productsToUpdate.isEmpty()) {
            productRepository.saveAll(productsToUpdate); // Un singur query de update (batch)
        }

        // B. Actualizăm subcategoriile
        List<Category> subcategories = categoryRepository.findByParentIdOrderByLabelAsc(parent.getId());
        
        for (Category sub : subcategories) {
            boolean statusChanged = sub.getIsActive() != targetStatus;
            
            if (statusChanged) {
                sub.setIsActive(targetStatus);
                categoryRepository.save(sub);
            }
            
            // Continuăm recursivitatea indiferent dacă s-a schimbat statusul părintelui sau nu
            // (pentru a asigura consistența în jos)
            propagateStatusRecursively(sub, targetStatus);
        }
    }

    private CategoryDTO convertToDTO(Category category) {
        boolean hasChildren = categoryRepository.existsByParent_IdAndIsActiveTrue(category.getId());
        return convertToDTO(category, hasChildren);
    }

    private CategoryDTO convertToDTO(Category category, boolean hasChildren) {
        return new CategoryDTO(
                category.getId(),
                category.getCode(),
                category.getLabel(),
                category.getParent() != null ? category.getParent().getId() : null,
                category.getIsActive(),
                hasChildren,
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
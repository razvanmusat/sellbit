package com.sellbit.domain.catalog.product;

import com.sellbit.domain.catalog.category.Category;
import com.sellbit.domain.catalog.category.CategoryRepository;
import com.sellbit.domain.lookup.producttype.ProductType;
import com.sellbit.domain.lookup.producttype.ProductTypeRepository;
import com.sellbit.domain.lookup.unitofmeasure.UnitOfMeasureRepository;
import com.sellbit.domain.lookup.vatrate.VatRateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UnitOfMeasureRepository unitOfMeasureRepository;
    private final VatRateRepository vatRateRepository;
    private final ProductTypeRepository productTypeRepository;

    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsForAdmin(Integer categoryId) {
        return productRepository.findByCategoryIdOrderByNameAsc(categoryId)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsForPos(Integer categoryId) {
        return productRepository.findByCategoryIdAndIsActiveTrueOrderByNameAsc(categoryId)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> searchForAdmin(String query) {
        return productRepository.findByNameContainingIgnoreCaseOrderByNameAsc(query)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> searchForPos(String query) {
        return productRepository.findByNameContainingIgnoreCaseAndIsActiveTrueOrderByNameAsc(query)
                .stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductDTO getProductByBarcode(String barcode) {
        Product product = productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        if (!product.getIsActive()) {
            throw new RuntimeException("ERROR.PRODUCT.INACTIVE");
        }

        return convertToDTO(product);
    }

    @Transactional
    public ProductDTO createProduct(ProductDTO dto) {
        if (dto.barcode() != null && !dto.barcode().isBlank() && productRepository.existsByBarcode(dto.barcode())) {
            throw new RuntimeException("ERROR.PRODUCT.DUPLICATE_BARCODE");
        }

        Product product = new Product();
        mapDtoToEntity(dto, product);

        product.setIsActive(true);        

        return convertToDTO(productRepository.save(product));
    }

    @Transactional
    public ProductDTO updateProduct(Integer id, ProductDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        if (dto.barcode() != null && !dto.barcode().equals(product.getBarcode())) {
            if (productRepository.existsByBarcode(dto.barcode())) {
                throw new RuntimeException("ERROR.PRODUCT.DUPLICATE_BARCODE");
            }
        }

        mapDtoToEntity(dto, product);
        return convertToDTO(productRepository.save(product));
    }

    @Transactional
    public void moveProduct(Integer productId, Integer newCategoryId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        Category category = categoryRepository.findById(newCategoryId)
                .orElseThrow(() -> new RuntimeException("ERROR.CATEGORY.NOT_FOUND"));

        if (categoryRepository.existsByParent_Id(category.getId())) {
            throw new RuntimeException("ERROR.CATEGORY.NOT_LEAF");
        }

        product.setCategory(category);
        productRepository.save(product);
    }

    @Transactional
    public void toggleStatus(Integer id, boolean active) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        // LOGICĂ NOUĂ: Validare Părinte la Reactivare
        if (active) {
            // Verificăm dacă categoria părinte este activă
            if (!product.getCategory().getIsActive()) {
                throw new RuntimeException("ERROR.PRODUCT.PARENT_CATEGORY_INACTIVE");
            }
        }

        product.setIsActive(active);
        productRepository.save(product);
    }

    private void mapDtoToEntity(ProductDTO dto, Product product) {
        product.setName(dto.name());
        product.setBarcode(dto.barcode());
        product.setSalePrice(dto.salePrice());        

        // 1. Căutăm Tipul Produsului (l-am mutat la început ca să putem decide stocul)
        ProductType type = productTypeRepository.findById(dto.productTypeId())
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT_TYPE.NOT_FOUND"));
        
        product.setProductType(type);

        if ("CATERING".equalsIgnoreCase(type.getCode())) {
            if (dto.purchasePrice() == null || dto.purchasePrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new RuntimeException("ERROR.CATERING.PRICE_REQUIRED");
            }
        }
        
        product.setPurchasePrice(dto.purchasePrice());

        // 2. LOGICĂ AUTOMATĂ TRACK STOCK
        // Dacă tipul este REGULAR -> trackStock = true
        // Orice altceva (SERVICE, CATERING, MENU, ADVANCE) -> trackStock = false
        if ("REGULAR".equalsIgnoreCase(type.getCode())) {
            product.setTrackStock(true);
        } else {
            product.setTrackStock(false);
        }

        // 3. Validare Categorie
        Category category = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new RuntimeException("ERROR.CATEGORY.NOT_FOUND"));

        if (categoryRepository.existsByParent_Id(category.getId())) {
            throw new RuntimeException("ERROR.CATEGORY.NOT_LEAF");
        }
        product.setCategory(category);

        // 4. Validare Unitate de Măsură
        product.setUnit(unitOfMeasureRepository.findById(dto.unitId())
                .orElseThrow(() -> new RuntimeException("ERROR.UNIT.NOT_FOUND")));

        // 5. Validare TVA (Acum este OBLIGATORIE)
        if (dto.vatRateId() == null) {
            throw new RuntimeException("ERROR.VAT.REQUIRED");
        }
        
        product.setVatRate(vatRateRepository.findById(dto.vatRateId())
                .orElseThrow(() -> new RuntimeException("ERROR.VAT.NOT_FOUND")));
    }

    private ProductDTO convertToDTO(Product product) {
        return new ProductDTO(
                product.getId(),
                product.getName(),
                product.getBarcode(),
                product.getCategory().getId(),
                product.getProductType().getId(),
                product.getProductType().getCode(),
                product.getUnit().getId(),
                product.getVatRate() != null ? product.getVatRate().getId() : null,
                product.getSalePrice(),
                product.getPurchasePrice(),
                product.getTrackStock(),
                product.getIsActive(),
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
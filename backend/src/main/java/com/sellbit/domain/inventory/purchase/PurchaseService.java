package com.sellbit.domain.inventory.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.productcomposite.ProductComponent;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.catering.cateringmenu.CateringMenu;
import com.sellbit.domain.catering.cateringmenu.CateringMenuRepository;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final StockCurrentService stockCurrentService;
    private final ProductComponentRepository productComponentRepository;
    private final CateringMenuRepository cateringMenuRepository;
    
    @Transactional(readOnly = true)
    public List<PurchaseDTOs.Response> getPurchasesByWarehouse(Integer warehouseId) {
        return purchaseRepository.findByWarehouseId(warehouseId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PurchaseDTOs.Response> getPurchasesByProduct(Integer productId) {
        return purchaseRepository.findByProductId(productId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PurchaseDTOs.Response> getPurchasesByDateRange(LocalDate start, LocalDate end) {
        return purchaseRepository.findByPurchasedAtBetween(start.atStartOfDay(), end.atTime(23, 59, 59)).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional
    public void processBulkPurchase(PurchaseDTOs.BulkCreate request) {
        User user = userRepository.findById(request.userId())
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        for (PurchaseDTOs.CreateItem item : request.items()) {
            Product product = productRepository.findById(item.productId())
                    .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

            Warehouse warehouse = warehouseRepository.findById(item.warehouseId())
                    .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

            Purchase purchase = Purchase.builder()
                    .product(product)
                    .warehouse(warehouse)
                    .user(user)
                    .quantity(item.quantity())
                    .remainingQuantity(item.quantity()) // non-null
                    .purchasePrice(item.purchasePrice())
                    .expirationDate(item.expirationDate())
                    .note(item.note())
                    .purchasedAt(LocalDateTime.now())
                    .build();

            purchaseRepository.save(purchase);
            stockCurrentService.updateStockRelative(warehouse.getId(), product.getId(), item.quantity());
        }
    }

    /**
     * Descarcă din loturi (FIFO). 
     * Dacă produsul este compus, descarcă din loturile fiecărei componente.
     */
    @Transactional
    public void deductFromBatchesFIFO(Integer warehouseId, Integer productId, BigDecimal quantityToDeduct) {
        if (quantityToDeduct == null || quantityToDeduct.compareTo(BigDecimal.ZERO) <= 0) {
            return; 
        }

        List<ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(productId);

        if (!components.isEmpty()) {
            for (ProductComponent comp : components) {
                BigDecimal totalCompQty = quantityToDeduct.multiply(comp.getQuantity());
                deductFromBatchesFIFO(warehouseId, comp.getChildProduct().getId(), totalCompQty);
            }
        } else {
            // --- MODIFICARE AICI ---
            Product product = productRepository.findById(productId)
                    .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

            // Descarcă din loturi DOAR dacă produsul are trackStock activ (ex: Suc, Apă)
            // Pizza (Catering) și Joaca (Service) vor fi ignorate aici
            if (Boolean.TRUE.equals(product.getTrackStock())) {
                List<Purchase> activeBatches = purchaseRepository.findActiveBatchesFIFO(warehouseId, productId);
                BigDecimal remaining = quantityToDeduct;

                for (Purchase batch : activeBatches) {
                    if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

                    BigDecimal available = batch.getRemainingQuantity();
                    if (available.compareTo(remaining) >= 0) {
                        batch.setRemainingQuantity(available.subtract(remaining));
                        remaining = BigDecimal.ZERO;
                    } else {
                        batch.setRemainingQuantity(BigDecimal.ZERO);
                        remaining = remaining.subtract(available);
                    }
                    purchaseRepository.save(batch);
                }
            }           
        }
    }

    @Transactional
    public void createVirtualReturnBatch(Integer warehouseId, Integer productId, Integer userId, BigDecimal quantity,
                                         String reason) {
        Product product = productRepository.findById(productId).orElseThrow();
        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();

        Purchase virtual = Purchase.builder()
                .product(product)
                .warehouse(warehouse)
                .user(user)
                .quantity(quantity)
                .remainingQuantity(quantity) // non-null
                .purchasePrice(BigDecimal.ZERO)
                .purchasedAt(LocalDateTime.of(1970, 1, 1, 0, 0)) // FIFO prioritate
                .note("VIRTUAL_IN: " + reason)
                .build();

        purchaseRepository.save(virtual);       
    }

    @Transactional(readOnly = true)
    public List<PurchaseDTOs.ExpirationAlert> getExpirationAlerts(int daysAhead) {
        LocalDate thresholdDate = LocalDate.now().plusDays(daysAhead);

        return purchaseRepository.findExpiringBatches(thresholdDate).stream()
                .map(p -> new PurchaseDTOs.ExpirationAlert(
                        p.getId(),
                        p.getProduct().getName(),
                        p.getWarehouse().getName(),
                        p.getRemainingQuantity(),
                        p.getExpirationDate(),
                        ChronoUnit.DAYS.between(LocalDate.now(), p.getExpirationDate())))
                .toList();
    }
    
    /**
     * Calculează prețul de achiziție FIFO. 
     * Dacă produsul este compus, prețul de achiziție este SUMA prețurilor componentelor.
     */
    @Transactional(readOnly = true)
    public BigDecimal getCurrentFIFOPurchasePrice(Integer warehouseId, Integer productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        // 1. Verificăm dacă are rețetă (Meniu/Catering compus)
        List<ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(productId);

        if (!components.isEmpty()) {
            BigDecimal totalCost = BigDecimal.ZERO;
            for (ProductComponent comp : components) {
                BigDecimal unitCost = getCurrentFIFOPurchasePrice(warehouseId, comp.getChildProduct().getId());
                totalCost = totalCost.add(comp.getQuantity().multiply(unitCost));
            }
            return totalCost.setScale(2, java.math.RoundingMode.HALF_UP);
        }

        // 2. Dacă NU are componente, verificăm codul tipului de produs
        // Aici accesăm câmpul .getCode() din entitatea ProductType
        if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {
            return cateringMenuRepository.findByProductIdAndIsActiveTrue(productId)
                    .map(CateringMenu::getPurchasePrice)
                    .orElse(BigDecimal.ZERO);
        }

        // 3. Produse fizice cu stoc (Suc, Apă)
        if (Boolean.TRUE.equals(product.getTrackStock())) {
            return purchaseRepository.findActiveBatchesFIFO(warehouseId, productId)
                    .stream()
                    .findFirst()
                    .map(Purchase::getPurchasePrice)
                    .orElseGet(() -> 
                        purchaseRepository.findAllBatchesFIFO(warehouseId, productId)
                                .stream()
                                .reduce((first, second) -> second)
                                .map(Purchase::getPurchasePrice)
                                .orElse(BigDecimal.ZERO)
                    );
        }

        // 4. Servicii (Joacă) sau orice altceva fără trackStock -> Cost 0
        return BigDecimal.ZERO;
    }

    private PurchaseDTOs.Response mapToResponse(Purchase p) {
        return new PurchaseDTOs.Response(
                p.getId(),
                p.getProduct().getName(),
                p.getWarehouse().getName(),
                p.getQuantity(),
                p.getRemainingQuantity(),
                p.getPurchasePrice(),
                p.getPurchasedAt(),
                p.getExpirationDate(),
                p.getNote()
        );
    }
}

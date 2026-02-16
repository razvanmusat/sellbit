package com.sellbit.domain.inventory.stockcurrent;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.productcomposite.ProductComponent;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockadjustment.StockAdjustment;
import com.sellbit.domain.inventory.stockadjustment.StockAdjustmentRepository;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReason;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReasonRepository;
import com.sellbit.domain.security.user.UserRepository;
import com.sellbit.domain.security.user.User;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Validated
public class StockCurrentService {

    private final StockCurrentRepository stockCurrentRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductComponentRepository productComponentRepository;
    private final StockAdjustmentRepository adjustmentRepository;
    private final AdjustmentReasonRepository reasonRepository;
    private final UserRepository userRepository;
    private final PurchaseService purchaseService;

    @Transactional(readOnly = true)
    public List<StockCurrentDTOs.Response> getStockByWarehouse(Integer warehouseId) {
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND");
        }
        return stockCurrentRepository.findById_WarehouseId(warehouseId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * LOGICA INVENTAR: Înlocuire faptică.
     * Folosește Lock pentru a preveni suprascrierea dacă se face inventar simultan.
     */
    @Transactional
    public void setPhysicalStock(StockCurrentDTOs.UpdateQuantity request) {
        // 1. Date comune (le luăm o singură dată)
        Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

        AdjustmentReason reason = reasonRepository.findByCode("INVENTORY_COUNT")
                .orElseThrow(() -> new RuntimeException("ERROR.REASON.NOT_FOUND"));

        User adminUser = userRepository.findByRoleCodeAndIsActiveTrue("ADMIN")
                .stream().findFirst()
                .orElseThrow(() -> new RuntimeException("ERROR.USER.ADMIN_NOT_FOUND"));

        // 2. Iterăm prin lista de produse din DTO
        for (StockCurrentDTOs.UpdateItem item : request.items()) {

            Product product = productRepository.findById(item.productId())
                    .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

            StockCurrent stock = getOrCreateStockForUpdate(warehouse.getId(), product);

            BigDecimal oldQty = stock.getQuantity();
            BigDecimal difference = item.newQuantity().subtract(oldQty);

            if (difference.compareTo(BigDecimal.ZERO) == 0)
                continue;

            stock.setQuantity(item.newQuantity());
            stockCurrentRepository.save(stock);

            adjustmentRepository.save(StockAdjustment.builder()
                    .product(stock.getProduct())
                    .warehouse(stock.getWarehouse())
                    .user(adminUser)
                    .reason(reason)
                    .quantityChange(difference)
                    .note(request.reason())
                    .build());

            if (difference.compareTo(BigDecimal.ZERO) < 0) {
                purchaseService.deductFromBatchesFIFO(warehouse.getId(), product.getId(), difference.abs());
            } else {
                purchaseService.createVirtualReturnBatch(warehouse.getId(), product.getId(), adminUser.getId(),
                        difference, "INVENTORY_PLUS: " + request.reason());
            }
        }
    }

    /**
     * LOGICA MIȘCĂRI GENERALE: Adunare/Scădere (Achiziții, Retururi).
     * Securizat cu PESSIMISTIC_WRITE.
     */
    @Transactional
    public void updateStockRelative(
            Integer warehouseId,
            @NonNull Integer productId,
            BigDecimal deltaQuantity) {

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        if (!Boolean.TRUE.equals(product.getTrackStock())) {
            return;
        }

        // BLOCHEAZĂ rândul în DB până la finalul tranzacției
        StockCurrent stock = getOrCreateStockForUpdate(warehouseId, product);
        BigDecimal newQuantity = stock.getQuantity().add(deltaQuantity);

        if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("ERROR.STOCK.INSUFFICIENT_QUANTITY");
        }

        stock.setQuantity(newQuantity);
        stockCurrentRepository.save(stock);
    }

    /**
     * LOGICA BONURI (Receipt): Sincronizare în timp real.
     * Modificată pentru a suporta rețetare (produse compuse).
     */
    @Transactional
    public void syncStockFromReceiptChange(Integer warehouseId, Integer productId, BigDecimal oldQty,
            BigDecimal newQty) {
        BigDecimal diff = newQty.subtract(oldQty);
        if (diff.compareTo(BigDecimal.ZERO) == 0)
            return;

        // Căutăm dacă produsul are componente active (rețetă)
        List<ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(productId);

        if (!components.isEmpty()) {
            // Dacă are rețetă, aplicăm diferența pentru fiecare componentă
            for (ProductComponent comp : components) {
                BigDecimal compDiff = diff.multiply(comp.getQuantity());
                // Scădem componenta (negate pentru că updateStockRelative adună delta)
                updateStockRelative(warehouseId, comp.getChildProduct().getId(), compDiff.negate());
            }
        } else {
            // Dacă este produs simplu, rămâne logica originală
            updateStockRelative(warehouseId, productId, diff.negate());
        }
    }

    @Transactional(readOnly = true)
    public BigDecimal getQuantity(Integer warehouseId, Integer productId) {
        return stockCurrentRepository.findById(new StockCurrentId(warehouseId, productId))
                .map(StockCurrent::getQuantity)
                .orElse(BigDecimal.ZERO);
    }

    /**
     * HELPER CRITIC: Obține stocul folosind SELECT FOR UPDATE.
     */
    private StockCurrent getOrCreateStockForUpdate(@NonNull Integer warehouseId, Product product) {
        return stockCurrentRepository.findById_WarehouseIdAndId_ProductIdForUpdate(warehouseId, product.getId())
                .orElseGet(() -> {
                    Warehouse warehouse = warehouseRepository.findById(warehouseId)
                            .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

                    return StockCurrent.builder()
                            .id(new StockCurrentId(warehouseId, product.getId()))
                            .warehouse(warehouse)
                            .product(product)
                            .quantity(BigDecimal.ZERO)
                            .build();
                });
    }

    private StockCurrentDTOs.Response mapToResponse(StockCurrent stock) {
        String categoryLabel = "GENERAL";
        if (stock.getProduct() != null && stock.getProduct().getCategory() != null) {
            categoryLabel = stock.getProduct().getCategory().getLabel();
        }

        return new StockCurrentDTOs.Response(
                stock.getId().getWarehouseId(),
                stock.getId().getProductId(),
                stock.getProduct().getName(),
                stock.getProduct().getBarcode(),
                stock.getProduct().getUnit().getLabel(),
                categoryLabel,
                stock.getQuantity(),
                stock.getUpdatedAt());
    }
}
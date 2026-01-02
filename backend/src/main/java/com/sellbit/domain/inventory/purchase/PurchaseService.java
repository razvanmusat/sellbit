package com.sellbit.domain.inventory.purchase;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
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

    @Transactional
    public void deductFromBatchesFIFO(Integer warehouseId, Integer productId, BigDecimal quantityToDeduct) {
        List<Purchase> activeBatches = purchaseRepository.findActiveBatchesFIFO(warehouseId, productId);
        BigDecimal remaining = quantityToDeduct;

        for (Purchase batch : activeBatches) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0)
                break;

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

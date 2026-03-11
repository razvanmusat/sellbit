package com.sellbit.domain.inventory.purchase;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
import com.sellbit.domain.inventory.purchasefifoallocation.ReceiptItemFifoAllocation;
import com.sellbit.domain.inventory.purchasefifoallocation.ReceiptItemFifoAllocationRepository;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentRepository;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
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
    private final StockCurrentRepository stockCurrentRepository;
    private final ProductComponentRepository productComponentRepository;
    private final ReceiptItemFifoAllocationRepository fifoAllocationRepository;

    // ISTORIC PRODUS
    @Transactional(readOnly = true)
    public List<PurchaseDTOs.Response> getPurchasesByProduct(Integer productId, Integer warehouseId) {
        if (warehouseId == null) {
            throw new RuntimeException("ERROR.WAREHOUSE.REQUIRED");
        }

        return purchaseRepository.findByProductIdAndWarehouseId(productId, warehouseId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    // RAPORT JURNAL
    @Transactional(readOnly = true)
    public List<PurchaseDTOs.Response> getPurchasesByDateRange(LocalDate start, LocalDate end, Integer warehouseId) {
        if (warehouseId == null) {
            throw new RuntimeException("ERROR.WAREHOUSE.REQUIRED");
        }

        return purchaseRepository.findByPurchasedAtBetweenAndWarehouseId(
                start.atStartOfDay(), 
                end.atTime(23, 59, 59), 
                warehouseId
        ).stream()
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

            // 1. Salvăm achiziția (codul tău vechi)
            Purchase purchase = Purchase.builder()
                    .product(product)
                    .warehouse(warehouse)
                    .user(user)
                    .quantity(item.quantity())
                    .remainingQuantity(item.quantity())
                    .purchasePrice(item.purchasePrice())
                    .expirationDate(item.expirationDate())                    
                    .purchasedAt(LocalDateTime.now())
                    .note(request.globalNote())
                    .build();

            purchaseRepository.save(purchase);

            // 2. Actualizăm stocul DIRECT (Aici am eliminat apelul către StockCurrentService)
            if (Boolean.TRUE.equals(product.getTrackStock())) {
                // Căutăm stocul existent sau creăm unul nou (fără să apelăm service-ul vecin)
                var stockId = new com.sellbit.domain.inventory.stockcurrent.StockCurrentId(warehouse.getId(), product.getId());
                
                var stock = stockCurrentRepository.findById(stockId) // Folosim repo-ul injectat la Pasul 1
                        .orElse(com.sellbit.domain.inventory.stockcurrent.StockCurrent.builder()
                                .id(stockId)
                                .warehouse(warehouse)
                                .product(product)
                                .quantity(java.math.BigDecimal.ZERO)
                                .build());

                // Adunăm cantitatea
                stock.setQuantity(stock.getQuantity().add(item.quantity()));
                stockCurrentRepository.save(stock);
            }
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
                Product child = comp.getChildProduct();
                Integer childWarehouseId = (child.getForcedWarehouse() != null)
                        ? child.getForcedWarehouse().getId()
                        : warehouseId;
                deductFromBatchesFIFO(childWarehouseId, child.getId(), totalCompQty);
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
    public boolean hasFifoAllocationsForReceipt(Integer receiptId) {
        return fifoAllocationRepository.existsByReceiptId(receiptId);
    }

    @Transactional
    public void rollbackFifoForReceipt(Integer receiptId) {
        List<ReceiptItemFifoAllocation> allocations = fifoAllocationRepository.findByReceiptId(receiptId);

        for (ReceiptItemFifoAllocation allocation : allocations) {
            Purchase purchase = allocation.getPurchase();
            if (purchase == null) {
                continue;
            }
            BigDecimal restored = purchase.getRemainingQuantity().add(allocation.getQuantity());
            purchase.setRemainingQuantity(restored);
            purchaseRepository.save(purchase);
        }

        fifoAllocationRepository.deleteByReceiptId(receiptId);
    }

    @Transactional
    public BigDecimal consumeForReceiptItemAndRecord(Integer warehouseId, Receipt receipt, ReceiptItem receiptItem) {
        if (receiptItem.getQuantity() == null || receiptItem.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
            return receiptItem.getPurchaseUnitPrice() != null ? receiptItem.getPurchaseUnitPrice() : BigDecimal.ZERO;
        }

        BigDecimal totalCost = consumeAndRecordTotalCost(
                warehouseId,
                receiptItem.getProduct(),
                receiptItem.getQuantity(),
                receipt,
                receiptItem);

        return totalCost.divide(receiptItem.getQuantity(), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal consumeAndRecordTotalCost(
            Integer warehouseId,
            Product product,
            BigDecimal quantityToDeduct,
            Receipt receipt,
            ReceiptItem receiptItem) {

        if (quantityToDeduct == null || quantityToDeduct.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        List<ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(product.getId());
        if (!components.isEmpty()) {
            BigDecimal totalCost = BigDecimal.ZERO;
            for (ProductComponent comp : components) {
                BigDecimal componentQty = quantityToDeduct.multiply(comp.getQuantity());
                Product child = comp.getChildProduct();
                Integer childWarehouseId = (child.getForcedWarehouse() != null)
                        ? child.getForcedWarehouse().getId()
                        : warehouseId;
                System.out.println("[FIFO] Componenta: " + child.getId() + " | forcedWarehouse: " + child.getForcedWarehouse() + " | warehouseId folosit: " + childWarehouseId + " | qty: " + componentQty);
                BigDecimal componentCost = consumeAndRecordTotalCost(
                        childWarehouseId,
                        child,
                        componentQty,
                        receipt,
                        receiptItem);
                totalCost = totalCost.add(componentCost);
            }
            return totalCost;
        }

        if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {
            BigDecimal unitCost = product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO;
            return unitCost.multiply(quantityToDeduct);
        }

        if (!Boolean.TRUE.equals(product.getTrackStock())) {
            return BigDecimal.ZERO;
        }

        List<Purchase> activeBatches = purchaseRepository.findActiveBatchesFIFO(warehouseId, product.getId());
        System.out.println("[FIFO] Produs simplu: " + product.getId() + " | warehouseId: " + warehouseId + " | loturi active: " + activeBatches.size() + " | qty necesara: " + quantityToDeduct);
        BigDecimal remaining = quantityToDeduct;
        BigDecimal totalCost = BigDecimal.ZERO;

        for (Purchase batch : activeBatches) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }

            BigDecimal available = batch.getRemainingQuantity();
            if (available.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal consumed = available.min(remaining);
            batch.setRemainingQuantity(available.subtract(consumed));
            purchaseRepository.save(batch);

            BigDecimal unitCost = batch.getPurchasePrice() != null ? batch.getPurchasePrice() : BigDecimal.ZERO;

            ReceiptItemFifoAllocation allocation = ReceiptItemFifoAllocation.builder()
                    .receipt(receipt)
                    .receiptItem(receiptItem)
                    .purchase(batch)
                    .warehouse(batch.getWarehouse())
                    .quantity(consumed)
                    .unitCost(unitCost)
                    .build();
            fifoAllocationRepository.save(allocation);

            totalCost = totalCost.add(consumed.multiply(unitCost));
            remaining = remaining.subtract(consumed);
        }

        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            throw new RuntimeException("ERROR.STOCK.BATCHES_INSUFFICIENT|product=" + product.getName() + "|warehouseId=" + warehouseId + "|needed=" + quantityToDeduct + "|batches=" + activeBatches.size());
        }

        return totalCost;
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

    // 1. Rețetă (Meniuri compuse) - SUMA componentelor
    List<ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(productId);
    if (!components.isEmpty()) {
        BigDecimal totalCost = BigDecimal.ZERO;
        for (ProductComponent comp : components) {
            Product child = comp.getChildProduct();
            Integer childWarehouseId = (child.getForcedWarehouse() != null)
                    ? child.getForcedWarehouse().getId()
                    : warehouseId;
            BigDecimal unitCost = getCurrentFIFOPurchasePrice(childWarehouseId, child.getId());
            totalCost = totalCost.add(comp.getQuantity().multiply(unitCost));
        }
        return totalCost.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    // 2. CATERING - Preț fix din fișa produsului
    if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {
        return product.getPurchasePrice() != null ? product.getPurchasePrice() : BigDecimal.ZERO;
    }

    // 3. Produse cu STOC (Suc, Apă) - FIFO
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

    // 4. SERVICII (Joacă) sau orice altceva fără trackStock
    // Returnăm 0 pentru ca profitul să fie egal cu prețul de vânzare net
    return BigDecimal.ZERO;
}

    private PurchaseDTOs.Response mapToResponse(Purchase p) {
        return new PurchaseDTOs.Response(
                p.getId(),
                p.getProduct().getName(),
                p.getWarehouse().getName(),
                p.getUser().getFullName(),
                p.getQuantity(),
                p.getRemainingQuantity(),
                p.getPurchasePrice(),
                p.getPurchasedAt(),
                p.getExpirationDate(),
                p.getNote()
        );
    }
}

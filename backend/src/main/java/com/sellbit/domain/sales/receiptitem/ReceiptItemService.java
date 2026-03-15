package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.product.ProductService;
import com.sellbit.domain.catalog.productcomposite.ProductComponent;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.config.InsufficientStockException;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptDTOs;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import com.sellbit.domain.sales.receiptitem.ReceiptItemDTO.ReceiptItemResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptItemService {

    private final ReceiptItemRepository itemRepository;
    private final ReceiptRepository receiptRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockCurrentService stockCurrentService;
    private final ReceiptService receiptService;
    private final PurchaseService purchaseService;
    private final ProductComponentRepository productComponentRepository;
    private final ProductService productService;

    /**
     * Adaugă sau actualizează un produs pe bon.
     * warehouseId vine din request — gestiunea se selectează per linie, nu de pe bon.
     */
    @Transactional
    public ReceiptDTOs.Response addOrUpdateItem(Integer receiptId, Integer productId,
            BigDecimal quantity, Integer warehouseId) {

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

        Warehouse resolvedWarehouse = productService.resolveWarehouse(product, warehouse);

        ReceiptItem item = receipt.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(productId)
                        && i.getWarehouse() != null
                        && i.getWarehouse().getId().equals(resolvedWarehouse.getId()))
                .findFirst()
                .orElse(null);

        BigDecimal oldQty = (item != null) ? item.getQuantity() : BigDecimal.ZERO;
        BigDecimal delta = quantity.subtract(oldQty);

        if (delta.compareTo(BigDecimal.ZERO) > 0) {
            validateStockAvailability(resolvedWarehouse.getId(), product, delta);
        }

        BigDecimal currentPurchasePrice = purchaseService.getCurrentFIFOPurchasePrice(
                resolvedWarehouse.getId(), productId);

        if (item == null) {
            item = ReceiptItem.builder()
                    .receipt(receipt)
                    .product(product)
                    .warehouse(resolvedWarehouse)
                    .quantity(BigDecimal.ZERO)
                    .unitPrice(product.getSalePrice())
                    .purchaseUnitPrice(currentPurchasePrice)
                    .vatRate(product.getVatRate() != null ? product.getVatRate().getRate() : BigDecimal.ZERO)
                    .isServiceTime(Boolean.FALSE.equals(product.getTrackStock()))
                    .build();
            receipt.addItem(item);
        } else {
            item.setPurchaseUnitPrice(currentPurchasePrice);
        }

        item.setQuantity(quantity);
        calculateLineTotals(item);
        itemRepository.save(item);

        stockCurrentService.syncStockFromReceiptChange(
                resolvedWarehouse.getId(), productId, oldQty, quantity);

        receiptService.updateReceiptTotals(receiptId);

        receipt.getItems().sort(java.util.Comparator.comparing(ReceiptItem::getId));
        return receiptService.mapToResponse(receipt);
    }

    /**
     * Șterge o linie și returnează totalurile noi ale bonului.
     */
    @Transactional
    public ReceiptDTOs.Response removeItem(Integer itemId) {
        ReceiptItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("ERROR.ITEM.NOT_FOUND"));

        Receipt receipt = item.getReceipt();

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        Warehouse itemWarehouse = productService.resolveWarehouse(
                item.getProduct(), item.getWarehouse());

        receipt.getItems().remove(item);

        stockCurrentService.syncStockFromReceiptChange(
                itemWarehouse.getId(),
                item.getProduct().getId(),
                item.getQuantity(),
                BigDecimal.ZERO);

        itemRepository.delete(item);

        receiptService.updateReceiptTotals(receipt.getId());

        receipt.getItems().sort(java.util.Comparator.comparing(ReceiptItem::getId));
        return receiptService.mapToResponse(receipt);
    }

    private void calculateLineTotals(ReceiptItem item) {
        BigDecimal total = item.getUnitPrice().multiply(item.getQuantity());

        BigDecimal vatDivisor = BigDecimal.ONE.add(
                item.getVatRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));

        BigDecimal net = total.divide(vatDivisor, 2, RoundingMode.HALF_UP);
        BigDecimal vat = total.subtract(net);

        item.setLineTotal(total);
        item.setNetTotal(net);
        item.setVatTotal(vat);
    }

    /**
     * Returnează lista de produse de pe un bon, cu cantitățile rămase disponibile pentru retur.
     *
     * Cheia de deduplicare este productId + warehouseId — același produs pe gestiuni diferite
     * se tratează independent. Fără acest fix, returul unui produs de pe GV ar scădea
     * cantitatea disponibilă și pentru același produs de pe GP.
     */
    @Transactional(readOnly = true)
    public List<ReceiptItemDTO.ReceiptItemResponse> getItemsByReceipt(Integer receiptId) {
        List<ReceiptItem> originalItems = itemRepository.findByReceiptIdOrderByIdAsc(receiptId);
        List<Receipt> refundReceipts = receiptRepository.findRefundsForReceipt(receiptId, "CLOSED");

        // Cheie: productId_warehouseId — tratăm independent același produs pe gestiuni diferite
        Map<String, BigDecimal> refundedQtyMap = new HashMap<>();

        if (refundReceipts != null) {
            for (Receipt refund : refundReceipts) {
                if (refund.getItems() == null) continue;
                for (ReceiptItem refundItem : refund.getItems()) {
                    if (refundItem.getQuantity() == null || refundItem.getProduct() == null) continue;

                    String key = refundItem.getProduct().getId() + "_" +
                            (refundItem.getWarehouse() != null
                                    ? refundItem.getWarehouse().getId()
                                    : "null");

                    refundedQtyMap.merge(key, refundItem.getQuantity().abs(), BigDecimal::add);
                }
            }
        }

        return originalItems.stream().map(item -> {
            String key = item.getProduct().getId() + "_" +
                    (item.getWarehouse() != null ? item.getWarehouse().getId() : "null");

            BigDecimal alreadyRefunded = refundedQtyMap.getOrDefault(key, BigDecimal.ZERO);
            BigDecimal remaining = item.getQuantity().subtract(alreadyRefunded);
            if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

            return new ReceiptItemDTO.ReceiptItemResponse(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getName(),
                    item.getQuantity(),
                    remaining,
                    item.getUnitPrice(),
                    item.getVatRate(),
                    item.getLineTotal(),
                    item.getNetTotal(),
                    item.getVatTotal(),
                    item.getWarehouse() != null ? item.getWarehouse().getId() : null,
                    item.getWarehouse() != null ? item.getWarehouse().getName() : null);
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<ReceiptItemDTO.QuantityReportResponse> getProductsQuantityReport(LocalDateTime start,
            LocalDateTime end, List<Integer> productIds, Integer warehouseId) {
        return itemRepository.getProductsQuantityReport(start, end, productIds, warehouseId);
    }

    @Transactional(readOnly = true)
    public List<ReceiptItemDTO.ProductTimelineResponse> getProductTimeline(LocalDateTime start,
            LocalDateTime end, Integer productId, Integer warehouseId) {
        return itemRepository.getProductTimeline(start, end, productId, warehouseId);
    }

    private void validateStockAvailability(Integer warehouseId, Product product, BigDecimal requiredQty) {
        List<String> missingProducts = new ArrayList<>();

        List<ProductComponent> components = productComponentRepository
                .findByParentProductIdAndIsActiveTrue(product.getId());

        if (components.isEmpty()) {
            checkSingleProductStock(warehouseId, product, requiredQty, missingProducts);
        } else {
            for (ProductComponent comp : components) {
                BigDecimal componentRequiredQty = requiredQty.multiply(comp.getQuantity());
                Product child = comp.getChildProduct();
                Integer childWarehouseId = (child.getForcedWarehouse() != null)
                        ? child.getForcedWarehouse().getId()
                        : warehouseId;
                checkSingleProductStock(childWarehouseId, child, componentRequiredQty, missingProducts);
            }
        }

        if (!missingProducts.isEmpty()) {
            throw new InsufficientStockException(missingProducts);
        }
    }

    private void checkSingleProductStock(Integer warehouseId, Product product, BigDecimal qtyToCheck,
            List<String> missingList) {
        if (!Boolean.TRUE.equals(product.getTrackStock())) return;

        BigDecimal currentStock = stockCurrentService.getQuantity(warehouseId, product.getId());

        if (currentStock.compareTo(qtyToCheck) < 0) {
            missingList.add(product.getName());
        }
    }

    public ReceiptItemResponse mapToItemResponse(ReceiptItem item) {
        return new ReceiptItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getVatRate(),
                item.getLineTotal(),
                item.getNetTotal(),
                item.getVatTotal(),
                item.getWarehouse() != null ? item.getWarehouse().getId() : null,
                item.getWarehouse() != null ? item.getWarehouse().getName() : null);
    }
}
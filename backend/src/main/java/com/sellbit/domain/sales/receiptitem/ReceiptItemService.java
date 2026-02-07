package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.productcomposite.ProductComponentRepository;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptDTOs;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import com.sellbit.domain.sales.receiptitem.ReceiptItemDTO.ReceiptItemResponse;
import com.sellbit.domain.catalog.productcomposite.ProductComponent;
import com.sellbit.domain.config.InsufficientStockException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptItemService {

    private final ReceiptItemRepository itemRepository;
    private final ReceiptRepository receiptRepository;
    private final ProductRepository productRepository;
    private final StockCurrentService stockCurrentService;
    private final ReceiptService receiptService;
    private final PurchaseService purchaseService;
    private final ProductComponentRepository productComponentRepository;

    /**
     * Adaugă sau actualizează un produs și returnează totalurile noi ale bonului.
     */
    @Transactional
    public ReceiptDTOs.Response addOrUpdateItem(Integer receiptId, Integer productId, BigDecimal quantity) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        ReceiptItem item = receipt.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(productId))
                .findFirst()
                .orElse(null);

        BigDecimal oldQty = (item != null) ? item.getQuantity() : BigDecimal.ZERO;
        BigDecimal delta = quantity.subtract(oldQty);
        if (delta.compareTo(BigDecimal.ZERO) > 0) {
            validateStockAvailability(receipt.getWarehouse().getId(), product, delta);
        }

        BigDecimal currentPurchasePrice = purchaseService.getCurrentFIFOPurchasePrice(
                receipt.getWarehouse().getId(),
                productId);

        if (item == null) {
            item = ReceiptItem.builder()
                    .receipt(receipt)
                    .product(product)
                    .quantity(BigDecimal.ZERO)
                    .unitPrice(product.getSalePrice())
                    .purchaseUnitPrice(currentPurchasePrice) // Prețul corect calculat mai sus
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

        // Sincronizare stoc (Scădere pentru vânzare)
        stockCurrentService.syncStockFromReceiptChange(receipt.getWarehouse().getId(), productId, oldQty, quantity);

        receiptService.updateReceiptTotals(receiptId);

        // REZOLVARE: Sortăm itemii după ID înainte de a trimite răspunsul,
        // pentru a asigura o ordine stabilă în frontend.
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

        receipt.getItems().remove(item);

        stockCurrentService.syncStockFromReceiptChange(
                receipt.getWarehouse().getId(),
                item.getProduct().getId(),
                item.getQuantity(),
                BigDecimal.ZERO);

        itemRepository.delete(item);

        // Sincronizăm header-ul după ștergere
        receiptService.updateReceiptTotals(receipt.getId());

        // REZOLVARE: Sortăm itemii după ID înainte de a trimite răspunsul,
        // pentru a asigura o ordine stabilă în frontend.
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
     * Returnează lista de produse de pe un bon, mapată la DTO.
     */
    @Transactional(readOnly = true)
    public List<ReceiptItemDTO.ReceiptItemResponse> getItemsByReceipt(Integer receiptId) {
        System.out.println("--- DEBUG RETUR START ---");
        System.out.println("1. Cautam iteme pentru bonul ID: " + receiptId);

        // 1. Itemele originale
        List<ReceiptItem> originalItems = itemRepository.findByReceiptIdOrderByIdAsc(receiptId);
        System.out.println("2. Iteme originale gasite: " + originalItems.size());

        // 2. Bonurile de retur
        // ATENȚIE: Aici folosim metoda din Repository. Verifică să o ai scrisă corect!
        List<Receipt> refundReceipts = receiptRepository.findRefundsForReceipt(receiptId, "CLOSED");
        
        System.out.println("3. Bonuri de RETUR gasite in baza de date: " + (refundReceipts != null ? refundReceipts.size() : "NULL"));

        // 3. Calcul mapă
        Map<Integer, BigDecimal> refundedQtyMap = new HashMap<>();

        if (refundReceipts != null) {
            for (Receipt refund : refundReceipts) {
                System.out.println("   -> Analizam bon retur ID: " + refund.getId());
                if (refund.getItems() == null) continue;
                
                for (ReceiptItem refundItem : refund.getItems()) {
                    System.out.println("      -> Item Retur: " + refundItem.getProduct().getName() + " | Qty: " + refundItem.getQuantity());
                    
                    if (refundItem.getQuantity() != null && refundItem.getProduct() != null) {
                        BigDecimal qty = refundItem.getQuantity().abs();
                        refundedQtyMap.merge(refundItem.getProduct().getId(), qty, BigDecimal::add);
                    }
                }
            }
        }
        
        System.out.println("4. Mapa finala de cantitati returnate: " + refundedQtyMap);

        // 4. Construire răspuns
        List<ReceiptItemDTO.ReceiptItemResponse> result = originalItems.stream().map(item -> {
            BigDecimal alreadyRefunded = refundedQtyMap.getOrDefault(item.getProduct().getId(), BigDecimal.ZERO);
            BigDecimal remaining = item.getQuantity().subtract(alreadyRefunded);

            if (remaining.compareTo(BigDecimal.ZERO) < 0) remaining = BigDecimal.ZERO;

            System.out.println("   CALCUL PRODUS: " + item.getProduct().getName());
            System.out.println("     Original: " + item.getQuantity());
            System.out.println("     Deja Returnat: " + alreadyRefunded);
            System.out.println("     Ramas: " + remaining);

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
                    item.getVatTotal()
            );
        }).toList();
        
        System.out.println("--- DEBUG RETUR END ---");
        return result;
    }

    @Transactional(readOnly = true)
    public List<ReceiptItemDTO.QuantityReportResponse> getProductsQuantityReport(LocalDateTime start, LocalDateTime end,
            List<Integer> productIds) {
        return itemRepository.getProductsQuantityReport(start, end, productIds);
    }

    // --- METODE NOI PENTRU VERIFICARE STOC ---

    private void validateStockAvailability(Integer warehouseId, Product product, BigDecimal requiredQty) {
        List<String> missingProducts = new ArrayList<>();

        // 1. Verificăm dacă e meniu (are componente)
        List<ProductComponent> components = productComponentRepository
                .findByParentProductIdAndIsActiveTrue(product.getId());

        if (components.isEmpty()) {
            // Produs simplu
            checkSingleProductStock(warehouseId, product, requiredQty, missingProducts);
        } else {
            // Produs compus (Meniu) -> verificăm fiecare ingredient
            for (ProductComponent comp : components) {
                BigDecimal componentRequiredQty = requiredQty.multiply(comp.getQuantity());
                checkSingleProductStock(warehouseId, comp.getChildProduct(), componentRequiredQty, missingProducts);
            }
        }

        // Dacă am găsit lipsuri, aruncăm excepția creată la Pasul 1
        if (!missingProducts.isEmpty()) {
            throw new InsufficientStockException(missingProducts);
        }
    }

    private void checkSingleProductStock(Integer warehouseId, Product product, BigDecimal qtyToCheck,
            List<String> missingList) {
        if (!Boolean.TRUE.equals(product.getTrackStock()))
            return;

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
                item.getQuantity(), // La bon deschis, remaining = quantity
                item.getUnitPrice(),
                item.getVatRate(),
                item.getLineTotal(),
                item.getNetTotal(),
                item.getVatTotal());
    }
}
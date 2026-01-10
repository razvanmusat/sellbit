package com.sellbit.domain.sales.receiptitem;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

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
      
        BigDecimal currentPurchasePrice;
        
     // Verificăm dacă este produs compus (are rețetă)
        boolean isComposite = !productComponentRepository.findByParentProductIdAndIsActiveTrue(productId).isEmpty();
        
        if (Boolean.TRUE.equals(product.getTrackStock()) || isComposite) {
            // Dacă urmărim stocul SAU dacă este compus, cerem prețul de la PurchaseService
            // PurchaseService știe deja să calculeze suma componentelor (modificarea anterioară)
            currentPurchasePrice = purchaseService.getCurrentFIFOPurchasePrice(receipt.getWarehouse().getId(), productId);
        } else {
            currentPurchasePrice = BigDecimal.ZERO;
        }

        if (item == null) {
            item = ReceiptItem.builder()
                    .receipt(receipt)
                    .product(product)
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

        stockCurrentService.syncStockFromReceiptChange(receipt.getWarehouse().getId(), productId, oldQty, quantity);
        receiptService.updateReceiptTotals(receiptId);

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
        
        stockCurrentService.syncStockFromReceiptChange(
                receipt.getWarehouse().getId(),
                item.getProduct().getId(),
                item.getQuantity(),
                BigDecimal.ZERO
        );

        itemRepository.delete(item);
        
        // Sincronizăm header-ul după ștergere
        receiptService.updateReceiptTotals(receipt.getId());

        return receiptService.mapToResponse(receipt);
    }

    private void calculateLineTotals(ReceiptItem item) {
        BigDecimal total = item.getUnitPrice().multiply(item.getQuantity());
        
        BigDecimal vatDivisor = BigDecimal.ONE.add(
                item.getVatRate().divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
        );
        
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
    public List<ReceiptItemResponse> getItemsByReceipt(Integer receiptId) {
        return itemRepository.findByReceiptId(receiptId).stream()
                .map(this::mapToItemResponse)
                .toList();
    }
    
    public ReceiptItemResponse mapToItemResponse(ReceiptItem item) {
        return new ReceiptItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getVatRate(),
                item.getLineTotal(),
                item.getNetTotal(),
                item.getVatTotal()
        );
    }
}
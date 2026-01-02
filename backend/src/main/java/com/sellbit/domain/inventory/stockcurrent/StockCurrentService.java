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
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Validated
public class StockCurrentService {

    private final StockCurrentRepository stockCurrentRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;

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
     */
    @Transactional
    public void setPhysicalStock(StockCurrentDTOs.UpdateQuantity request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        if (!Boolean.TRUE.equals(product.getTrackStock())) {
            return;
        }

        StockCurrent stock = getOrCreateStock(request.warehouseId(), product);

        // Regula business – inventar fizic nu poate fi negativ
        if (request.newQuantity().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("ERROR.STOCK.NEGATIVE_NOT_ALLOWED");
        }

        stock.setQuantity(request.newQuantity());
        stockCurrentRepository.save(stock);
    }

    /**
     * LOGICA MIȘCĂRI GENERALE: Adunare/Scădere (Achiziții, Retururi).
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

        StockCurrent stock = getOrCreateStock(warehouseId, product);
        BigDecimal newQuantity = stock.getQuantity().add(deltaQuantity);

        // Regula business – nu permitem stoc negativ
        if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("ERROR.STOCK.INSUFFICIENT_QUANTITY");
        }

        stock.setQuantity(newQuantity);
        stockCurrentRepository.save(stock);
    }


    /**
     * LOGICA BONURI (Receipt): Sincronizare în timp real.
     */
    @Transactional
    public void syncStockFromReceiptChange(Integer warehouseId, Integer productId, BigDecimal oldQty, BigDecimal newQty) {
        // Delta calculat: dacă reducem cantitatea pe bon, punem înapoi în stoc (delta pozitiv)
        BigDecimal delta = oldQty.subtract(newQty);
        updateStockRelative(warehouseId, productId, delta);
    }
    
    @Transactional(readOnly = true)
    public BigDecimal getQuantity(Integer warehouseId, Integer productId) {
        return stockCurrentRepository.findById(new StockCurrentId(warehouseId, productId))
                .map(StockCurrent::getQuantity)
                .orElse(BigDecimal.ZERO); // Dacă nu există rând în tabelă, stocul e 0
    }

    /**
     * Helper pentru a asigura existența rândului în HUB-ul de stoc.
     */
    private StockCurrent getOrCreateStock(@NonNull Integer warehouseId, Product product) {
        StockCurrentId id = new StockCurrentId(warehouseId, product.getId());
        
        return stockCurrentRepository.findById(id)
                .orElseGet(() -> {
                    Warehouse warehouse = warehouseRepository.findById(warehouseId)
                            .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));
                    
                    return StockCurrent.builder()
                            .id(id)
                            .warehouse(warehouse)
                            .product(product)
                            .quantity(BigDecimal.ZERO)
                            .build();
                });
    }

    private StockCurrentDTOs.Response mapToResponse(StockCurrent stock) {
        return new StockCurrentDTOs.Response(
                stock.getId().getWarehouseId(),
                stock.getId().getProductId(),
                stock.getProduct().getName(),
                stock.getProduct().getBarcode(),
                stock.getProduct().getUnit().getLabel(),
                stock.getQuantity(),
                stock.getUpdatedAt()
        );
    }
}
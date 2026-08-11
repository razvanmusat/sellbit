package com.sellbit.domain.inventory.stockadjustment;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReason;
import com.sellbit.domain.lookup.adjustmentreason.AdjustmentReasonRepository;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockAdjustmentService {

    private final StockAdjustmentRepository adjustmentRepository;
    private final ProductRepository productRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;
    private final AdjustmentReasonRepository reasonRepository;

    private final PurchaseService purchaseService;
    private final StockCurrentService stockCurrentService;

    @Transactional(readOnly = true)
    public List<StockAdjustmentDTOs.Response> getAdjustmentsByProduct(Integer productId) {
        if (!productRepository.existsById(productId)) {
            throw new RuntimeException("ERROR.PRODUCT.NOT_FOUND");
        }
        return adjustmentRepository.findByProductIdOrderByAdjustedAtDesc(productId)
                .stream().map(this::mapToResponse).toList();
    }

    /**
     * Procesează o ajustare de stoc și sincronizează loturile FIFO.
     */
    @Transactional
    public void processAdjustment(StockAdjustmentDTOs.Create dto) {

        // 0. Validare logică de bază
        if (dto.quantityChange() == null || dto.quantityChange().compareTo(BigDecimal.ZERO) == 0) {
            throw new RuntimeException("ERROR.ADJUSTMENT.INVALID_QUANTITY");
        }

        // 1. Identificare și Validare entități
        Product product = productRepository.findById(dto.productId())
                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.NOT_FOUND"));

        if (Boolean.FALSE.equals(product.getTrackStock())) {
            throw new RuntimeException("ERROR.ADJUSTMENT.NOT_TRACKED_PRODUCT");
        }

        Warehouse warehouse = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

        User user = userRepository.findById(dto.userId())
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        AdjustmentReason reason = reasonRepository.findById(dto.reasonId())
                .orElseThrow(() -> new RuntimeException("ERROR.ADJUSTMENT_REASON.NOT_FOUND"));

        // 2. VERIFICARE STOC (Prevenire Stoc Negativ)
        if (dto.quantityChange().compareTo(BigDecimal.ZERO) < 0) {
            BigDecimal currentStock = stockCurrentService.getQuantity(warehouse.getId(), product.getId());
            if (currentStock.compareTo(dto.quantityChange().abs()) < 0) {
                throw new RuntimeException("ERROR.ADJUSTMENT.INSUFFICIENT_STOCK");
            }
        }

        // 3. Salvare în jurnal
        adjustmentRepository.save(
                StockAdjustment.builder()
                        .product(product)
                        .warehouse(warehouse)
                        .user(user)
                        .reason(reason)
                        .quantityChange(dto.quantityChange())
                        .note(dto.note())
                        .build());

        // 4. Sincronizare FIFO
        if (dto.quantityChange().compareTo(BigDecimal.ZERO) < 0) {
            purchaseService.deductFromBatchesFEFO(
                    warehouse.getId(),
                    product.getId(),
                    dto.quantityChange().abs());
        } else {
            purchaseService.createVirtualReturnBatch(
                    warehouse.getId(),
                    product.getId(),
                    user.getId(),
                    dto.quantityChange(),
                    "ADJUSTMENT: " + reason.getLabel());
        }

        // 5. STOC CURENT – sursa de adevăr
        stockCurrentService.updateStockRelative(
                warehouse.getId(),
                product.getId(),
                dto.quantityChange());
    }

    // Raport Jurnal (Gestiune + Dată)
    @Transactional(readOnly = true)
    public List<StockAdjustmentDTOs.Response> getAdjustmentsByDateRange(Integer warehouseId, LocalDate start,
            LocalDate end) {
        // Validare gestiune
        if (!warehouseRepository.existsById(warehouseId)) {
            throw new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND");
        }

        return adjustmentRepository.findByWarehouseIdAndAdjustedAtBetweenOrderByAdjustedAtDesc(
                warehouseId,
                start.atStartOfDay(),
                end.atTime(23, 59, 59)).stream().map(this::mapToResponse).toList();
    }

    private StockAdjustmentDTOs.Response mapToResponse(StockAdjustment s) {
        return new StockAdjustmentDTOs.Response(
                s.getId(),
                s.getProduct().getName(),
                s.getWarehouse().getId(),
                s.getWarehouse().getName(),
                s.getReason().getLabel(),
                s.getUser().getFullName(),
                s.getQuantityChange(),
                s.getNote(),
                s.getAdjustedAt());
    }
}

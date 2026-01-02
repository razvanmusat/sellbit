package com.sellbit.domain.inventory.warehouse;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import com.sellbit.domain.inventory.stockcurrent.StockCurrentRepository; // Va fi creat la pasul următor

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Validated
public class WarehouseService {

    private final WarehouseRepository warehouseRepository;
    private final StockCurrentRepository stockCurrentRepository;

    @Transactional(readOnly = true)
    public List<WarehouseDTOs.Response> findAllActive() {
        return warehouseRepository.findAllByIsActiveTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<WarehouseDTOs.Response> findAllInactive() {
        return warehouseRepository.findAllByIsActiveFalse().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public WarehouseDTOs.Response create(WarehouseDTOs.Create request) {
        if (warehouseRepository.existsByCode(request.code())) {
            throw new RuntimeException("ERROR.WAREHOUSE.CODE_EXISTS");
        }

        Warehouse warehouse = Warehouse.builder()
                .code(request.code())
                .name(request.name())
                .isActive(true)
                .build();

        return mapToResponse(warehouseRepository.save(warehouse));
    }

    @Transactional
    public WarehouseDTOs.Response update(WarehouseDTOs.Update request) {
        Warehouse warehouse = warehouseRepository.findById(request.id())
                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

        if (warehouseRepository.existsByCodeAndIdNot(request.code(), request.id())) {
            throw new RuntimeException("ERROR.WAREHOUSE.CODE_EXISTS");
        }

        warehouse.setCode(request.code());
        warehouse.setName(request.name());

        return mapToResponse(warehouseRepository.save(warehouse));
    }

    @Transactional
    public void toggleStatus(@NonNull Integer id) {
        Warehouse warehouse = warehouseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

        // Dacă gestiunea este activă și vrem să o dezactivăm, verificăm stocul
        if (warehouse.isActive()) {
        	// Modificăm 0.0 în BigDecimal.ZERO
        	boolean hasStock = stockCurrentRepository.existsById_WarehouseIdAndQuantityGreaterThan(id, java.math.BigDecimal.ZERO);            if (hasStock) {
                throw new RuntimeException("ERROR.WAREHOUSE.HAS_STOCK");
            }
        }

        warehouse.setActive(!warehouse.isActive());
        warehouseRepository.save(warehouse);
    }

    private WarehouseDTOs.Response mapToResponse(Warehouse warehouse) {
        return new WarehouseDTOs.Response(
                warehouse.getId(),
                warehouse.getCode(),
                warehouse.getName(),
                warehouse.isActive(),
                warehouse.getCreatedAt()
        );
    }
}
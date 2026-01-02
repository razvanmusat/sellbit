package com.sellbit.domain.inventory.warehouse;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
@Validated
public class WarehouseController {
	
	private final WarehouseService warehouseService;
	
	@GetMapping("/active")
	public ResponseEntity<List<WarehouseDTOs.Response>> getAllActive() {
		return ResponseEntity.ok(warehouseService.findAllActive());
	}
	
	@GetMapping("/inactive")
	public ResponseEntity<List<WarehouseDTOs.Response>> getAllInactive() {
		return ResponseEntity.ok(warehouseService.findAllInactive());
	}
	
	@PostMapping
    public ResponseEntity<WarehouseDTOs.Response> create(@Valid @RequestBody WarehouseDTOs.Create request) {
        return ResponseEntity.ok(warehouseService.create(request));
    }
	
	@PutMapping
	public ResponseEntity<WarehouseDTOs.Response> update(@Valid @RequestBody WarehouseDTOs.Update request) {
		return ResponseEntity.ok(warehouseService.update(request));
	}
	
	@PatchMapping("/{id}/toggle-status")
	public ResponseEntity<Void> toggleStatus(@PathVariable @NotNull(message = "ERROR.WAREHOUSE.ID_REQUIRED") Integer id) {
		warehouseService.toggleStatus(id);
		return ResponseEntity.noContent().build();
	}
}

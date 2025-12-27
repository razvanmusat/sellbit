package com.sellbit.domain.lookup.adjustmentreason;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lookup/adjustment-reasons")
@RequiredArgsConstructor
public class AdjustmentReasonController {
	
	private final AdjustmentReasonService service;
	
	@GetMapping
	public List<AdjustmentReason> getAll() {
		return service.getAll();
	}
	
	@PostMapping
    public ResponseEntity<AdjustmentReason> create(@RequestBody AdjustmentReason reason) {
        return ResponseEntity.ok(service.save(reason));
    }
	
	@PutMapping("/{id}")
    public ResponseEntity<AdjustmentReason> update(@PathVariable Integer id, @RequestBody AdjustmentReason reason) {
        reason.setId(id);
        return ResponseEntity.ok(service.save(reason));
    }
}

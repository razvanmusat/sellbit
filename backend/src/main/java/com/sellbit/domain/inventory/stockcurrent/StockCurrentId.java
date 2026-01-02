package com.sellbit.domain.inventory.stockcurrent;

import java.io.Serializable;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode
public class StockCurrentId implements Serializable {
	
	private static final long serialVersionUID = 1L;
	
    @Column(name = "warehouse_id")
    private Integer warehouseId;

    @Column(name = "product_id")
    private Integer productId;
}
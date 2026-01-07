package com.sellbit.domain.cash.cashmovement;

import com.sellbit.domain.cash.cashdrawer.CashDrawerService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.cashmovementtype.CashMovementType;
import com.sellbit.domain.lookup.cashmovementtype.CashMovementTypeRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CashMovementService {

    private final CashMovementRepository movementRepository;
    private final CashDrawerService cashDrawerService;
    private final CashMovementTypeRepository typeRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    /**
     * Înregistrează o mișcare de cash și actualizează automat soldul live al sertarului.
     */
    @Transactional
    public void createMovement(Integer warehouseId, String typeCode, BigDecimal amount, Integer userId, String note) {
        // 1. Validăm existența datelor
        Warehouse warehouse = warehouseRepository.findById(warehouseId)
                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));
        
        CashMovementType type = typeRepository.findByCode(typeCode)
                .orElseThrow(() -> new RuntimeException("ERROR.MOVEMENT_TYPE.NOT_FOUND"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

        // 2. Logica pentru semn: 
        // SALE și CASH_IN sunt pozitive (adună bani).
        // REFUND, PAYMENT_SUPPLIER, BANK_DEPOSIT și CASH_OUT sunt negative (scad bani).
        BigDecimal finalAmount = amount;

        if (typeCode.equals("REFUND") || 
        	typeCode.equals("REFUND_CARD") ||
            typeCode.equals("PAYMENT_SUPPLIER") || 
            typeCode.equals("BANK_DEPOSIT") || 
            typeCode.equals("CASH_OUT")) {
            
            finalAmount = amount.negate(); 
        }

        // 3. Salvăm mișcarea de audit cu suma corectată
        CashMovement movement = CashMovement.builder()
                .warehouse(warehouse)
                .movementType(type)
                .amount(finalAmount)
                .user(user)
                .note(note)
                .build();
        
        movementRepository.save(movement);

        // 4. Actualizăm soldul LIVE în CashDrawer
        if (!typeCode.contains("CARD")) {
            cashDrawerService.updateBalance(warehouseId, finalAmount);
        }
    }
}
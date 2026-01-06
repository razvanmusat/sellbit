package com.sellbit.domain.cash.cashmovement;

import com.sellbit.domain.cash.cashdrawer.CashDrawerService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.cashmovementtype.CashMovementType;
import com.sellbit.domain.lookup.cashmovementtype.CashMovementTypeRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CashMovementServiceTest {

    @Mock private CashMovementRepository movementRepository;
    @Mock private CashDrawerService cashDrawerService;
    @Mock private CashMovementTypeRepository typeRepository;
    @Mock private WarehouseRepository warehouseRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private CashMovementService cashMovementService;

    private Warehouse warehouse;
    private User user;
    private CashMovementType typeIn;
    private CashMovementType typeOut;

    @BeforeEach
    void setUp() {
        warehouse = Warehouse.builder().id(1).build();
        user = User.builder().id(1).build();
        typeIn = new CashMovementType(); // Presupunem că are setCode/getCode
        typeOut = new CashMovementType();
    }

    @Test
    @DisplayName("createMovement - Succes: CASH_IN rămâne pozitiv")
    void createMovement_In_Success() {
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(typeRepository.findByCode("SALE")).thenReturn(Optional.of(typeIn));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        cashMovementService.createMovement(1, "SALE", new BigDecimal("100.00"), 1, "Vânzare");

        ArgumentCaptor<CashMovement> captor = ArgumentCaptor.forClass(CashMovement.class);
        verify(movementRepository).save(captor.capture());
        
        assertEquals(new BigDecimal("100.00"), captor.getValue().getAmount());
        verify(cashDrawerService).updateBalance(1, new BigDecimal("100.00"));
    }

    @Test
    @DisplayName("createMovement - Succes: BANK_DEPOSIT devine negativ (negate)")
    void createMovement_Out_Success() {
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(typeRepository.findByCode("BANK_DEPOSIT")).thenReturn(Optional.of(typeOut));
        when(userRepository.findById(1)).thenReturn(Optional.of(user));

        cashMovementService.createMovement(1, "BANK_DEPOSIT", new BigDecimal("50.00"), 1, "Depunere");

        ArgumentCaptor<CashMovement> captor = ArgumentCaptor.forClass(CashMovement.class);
        verify(movementRepository).save(captor.capture());

        assertEquals(new BigDecimal("-50.00"), captor.getValue().getAmount());
        verify(cashDrawerService).updateBalance(1, new BigDecimal("-50.00"));
    }

    @Test
    @DisplayName("createMovement - Fail: User inexistent")
    void createMovement_UserNotFound() {
        when(warehouseRepository.findById(1)).thenReturn(Optional.of(warehouse));
        when(typeRepository.findByCode("SALE")).thenReturn(Optional.of(typeIn));
        when(userRepository.findById(1)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, 
            () -> cashMovementService.createMovement(1, "SALE", BigDecimal.TEN, 1, ""));
        
        assertEquals("ERROR.USER.NOT_FOUND", ex.getMessage());
    }
}
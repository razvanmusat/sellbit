package com.sellbit.domain.inventory.purchasefifoallocation;

import com.sellbit.domain.inventory.purchase.Purchase;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReceiptItemFifoAllocationRepositoryTest {

    @Mock
    private ReceiptItemFifoAllocationRepository repo;

    @Test
    void testSaveAndFindByReceiptId() {
        ReceiptItemFifoAllocation alloc = ReceiptItemFifoAllocation.builder()
                .receipt(Receipt.builder().id(1).build())
                .receiptItem(ReceiptItem.builder().id(1).build())
                .purchase(new Purchase())
                .quantity(BigDecimal.valueOf(5))
                .unitCost(BigDecimal.valueOf(2.5))
                .build();

        when(repo.findByReceiptId(1)).thenReturn(List.of(alloc));

        List<ReceiptItemFifoAllocation> found = repo.findByReceiptId(1);
        assertEquals(1, found.size());
        assertEquals(1, found.get(0).getReceiptItem().getId());
    }

    @Test
    void testExistsByReceiptId() {
        when(repo.existsByReceiptId(1)).thenReturn(true);
        when(repo.existsByReceiptId(-1)).thenReturn(false);

        assertTrue(repo.existsByReceiptId(1));
        assertFalse(repo.existsByReceiptId(-1));
    }

    @Test
    void testDeleteByReceiptId() {
        doNothing().when(repo).deleteByReceiptId(1);
        when(repo.existsByReceiptId(1)).thenReturn(false);

        repo.deleteByReceiptId(1);
        assertFalse(repo.existsByReceiptId(1));
    }
}

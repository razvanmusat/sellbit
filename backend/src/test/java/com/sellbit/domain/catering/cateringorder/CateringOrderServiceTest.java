package com.sellbit.domain.catering.cateringorder;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.playground.PlaygroundReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CateringOrderServiceTest {

    @Mock private CateringOrderRepository orderRepository;
    @Mock private PlaygroundReservationRepository reservationRepository;
    @Mock private ProductRepository productRepository;

    @InjectMocks private CateringOrderService orderService;

    private Product product;

    @BeforeEach
    void setUp() {
        // Folosesc Builder-ul entității Product (presupunând că ai Lombok @Builder pe ea, conform structurii tale)
        product = Product.builder()
                .id(50)
                .name("Pizza Test")
                .build();
    }

    @Test
    @DisplayName("createOrder: Succes bar (fără rezervare, forțează data azi)")
    void createOrder_BarOrder_Success() {
        // CreateOrderRequest(Integer productId, Integer reservationId, Integer quantity, LocalDate orderDate)
        var req = new CateringOrderDTOs.CreateOrderRequest(50, null, 2, LocalDate.now().plusDays(5));

        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(orderRepository.save(any(CateringOrder.class))).thenAnswer(i -> {
            CateringOrder o = i.getArgument(0);
            o.setId(1);
            return o;
        });

        var result = orderService.createOrder(req);

        assertEquals(LocalDate.now(), result.orderDate());
        assertEquals(50, result.productId());
        assertEquals("Pizza Test", result.productName());
    }

    @Test
    @DisplayName("updateOrder: Succes editare comandă viitoare")
    void updateOrder_FutureDate_Success() {
        var existing = CateringOrder.builder()
                .id(1)
                .product(product)
                .orderDate(LocalDate.now().plusDays(1))
                .build();
        
        var req = new CateringOrderDTOs.CreateOrderRequest(50, null, 15, LocalDate.now().plusDays(1));

        when(orderRepository.findById(1)).thenReturn(Optional.of(existing));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(orderRepository.save(any(CateringOrder.class))).thenReturn(existing);

        var result = orderService.updateOrder(1, req);

        assertEquals(15, result.quantity());
        verify(orderRepository).save(existing);
    }

    @Test
    @DisplayName("updateOrder: Eroare la editarea unei comenzi din trecut")
    void updateOrder_PastDate_ThrowsException() {
        var pastOrder = CateringOrder.builder()
                .id(1)
                .orderDate(LocalDate.now().minusDays(1))
                .build();
        
        var req = new CateringOrderDTOs.CreateOrderRequest(50, null, 1, LocalDate.now());

        when(orderRepository.findById(1)).thenReturn(Optional.of(pastOrder));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> orderService.updateOrder(1, req));
        assertEquals("ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE", ex.getMessage());
    }

    @Test
    @DisplayName("processBulkPayment: Execută plata bulk corect")
    void processBulkPayment_Success() {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of(1, 2));
        
        orderService.processBulkPayment(req);
        
        verify(orderRepository).markAsPaidBulk(eq(List.of(1, 2)), any(LocalDateTime.class));
    }
}
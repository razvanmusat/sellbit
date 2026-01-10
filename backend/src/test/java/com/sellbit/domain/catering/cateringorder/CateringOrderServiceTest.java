package com.sellbit.domain.catering.cateringorder;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catering.cateringmenu.CateringMenu;
import com.sellbit.domain.catering.cateringmenu.CateringMenuRepository;
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
    @Mock private CateringMenuRepository menuRepository;
    @Mock private PlaygroundReservationRepository reservationRepository;
    @Mock private ProductRepository productRepository; // Adăugat: necesar pentru mapToResponse

    @InjectMocks private CateringOrderService orderService;

    private CateringMenu menu;
    private Product product;

    @BeforeEach
    void setUp() {
        product = Product.builder().id(50).name("Pizza Test").build();
        menu = CateringMenu.builder().id(10).productId(50).build();
    }

    @Test
    @DisplayName("createOrder: Succes bar (fără rezervare, forțează data azi)")
    void createOrder_BarOrder_Success() {
        var req = new CateringOrderDTOs.CreateOrderRequest(10, null, 2, LocalDate.now().plusDays(5));

        when(menuRepository.findById(10)).thenReturn(Optional.of(menu));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(orderRepository.save(any(CateringOrder.class))).thenAnswer(i -> {
            CateringOrder o = i.getArgument(0);
            o.setId(1);
            return o;
        });

        var result = orderService.createOrder(req);

        assertEquals(LocalDate.now(), result.orderDate());
        assertEquals("Pizza Test", result.menuName());
    }

    @Test
    @DisplayName("updateOrder: Succes editare comandă viitoare")
    void updateOrder_FutureDate_Success() {
        var existing = CateringOrder.builder().id(1).menu(menu).orderDate(LocalDate.now().plusDays(1)).build();
        var req = new CateringOrderDTOs.CreateOrderRequest(10, null, 15, LocalDate.now().plusDays(1));

        when(orderRepository.findById(1)).thenReturn(Optional.of(existing));
        when(menuRepository.findById(10)).thenReturn(Optional.of(menu));
        when(productRepository.findById(50)).thenReturn(Optional.of(product));
        when(orderRepository.save(any())).thenReturn(existing);

        var result = orderService.updateOrder(1, req);

        assertEquals(15, result.quantity());
        verify(orderRepository).save(existing);
    }

    @Test
    @DisplayName("updateOrder: Eroare la editarea unei comenzi din trecut")
    void updateOrder_PastDate_ThrowsException() {
        var pastOrder = CateringOrder.builder().id(1).orderDate(LocalDate.now().minusDays(1)).build();
        var req = new CateringOrderDTOs.CreateOrderRequest(10, null, 1, LocalDate.now());

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
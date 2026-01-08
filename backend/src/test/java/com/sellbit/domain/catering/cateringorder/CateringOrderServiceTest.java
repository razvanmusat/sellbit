package com.sellbit.domain.catering.cateringorder;

import com.sellbit.domain.catering.cateringmenu.CateringMenu;
import com.sellbit.domain.catering.cateringmenu.CateringMenuRepository;
import com.sellbit.domain.playground.PlaygroundReservationRepository;
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

    @Mock
    private CateringOrderRepository orderRepository;
    @Mock
    private CateringMenuRepository menuRepository;
    @Mock
    private PlaygroundReservationRepository reservationRepository;

    @InjectMocks
    private CateringOrderService orderService;

    // --- 1. TESTE createOrder ---

    @Test
    @DisplayName("createOrder: Succes comandă bar (fără rezervare, forțează data azi)")
    void createOrder_BarOrder_Success() {
        var req = new CateringOrderDTOs.CreateOrderRequest(10, null, 2, LocalDate.now().plusDays(5));
        var menu = CateringMenu.builder().id(10).name("Pizza").build();

        when(menuRepository.findById(10)).thenReturn(Optional.of(menu));
        when(orderRepository.save(any(CateringOrder.class))).thenAnswer(i -> {
            CateringOrder o = i.getArgument(0);
            o.setId(1);
            return o;
        });

        var result = orderService.createOrder(req);

        assertNotNull(result);
        assertEquals(LocalDate.now(), result.orderDate()); // Verificăm că a forțat LocalDate.now()
        verify(orderRepository).save(any(CateringOrder.class));
    }

    @Test
    @DisplayName("createOrder: Eroare când menuId nu există în baza de date")
    void createOrder_MenuNotFound_ThrowsException() {
        var req = new CateringOrderDTOs.CreateOrderRequest(99, null, 1, LocalDate.now());
        when(menuRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () -> orderService.createOrder(req));
        assertEquals("ERROR.CATERING_ORDER.MENU_NOT_FOUND", ex.getMessage());
    }

    // --- 2. TESTE updateOrder ---

    @Test
    @DisplayName("updateOrder: Succes editare comandă viitoare")
    void updateOrder_FutureDate_Success() {
        var existing = CateringOrder.builder().id(1).orderDate(LocalDate.now().plusDays(1)).build();
        var menu = CateringMenu.builder().id(2).name("Menu Nou").build();
        var req = new CateringOrderDTOs.CreateOrderRequest(2, null, 10, LocalDate.now().plusDays(1));

        when(orderRepository.findById(1)).thenReturn(Optional.of(existing));
        when(menuRepository.findById(2)).thenReturn(Optional.of(menu));
        when(orderRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        var result = orderService.updateOrder(1, req);

        assertEquals(10, result.quantity());
        verify(orderRepository).save(existing);
    }

    @Test
    @DisplayName("updateOrder: Eroare la editarea unei comenzi din trecut")
    void updateOrder_PastDate_ThrowsException() {
        var pastOrder = CateringOrder.builder().id(1).orderDate(LocalDate.now().minusDays(1)).build();
        var req = new CateringOrderDTOs.CreateOrderRequest(1, null, 1, LocalDate.now());

        when(orderRepository.findById(1)).thenReturn(Optional.of(pastOrder));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> orderService.updateOrder(1, req));
        assertEquals("ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE", ex.getMessage());
    }

    // --- 3. TESTE processBulkPayment ---

    @Test
    @DisplayName("processBulkPayment: Execută plata bulk pentru lista de ID-uri")
    void processBulkPayment_Success() {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of(1, 2));

        orderService.processBulkPayment(req);

        verify(orderRepository).markAsPaidBulk(eq(List.of(1, 2)), any(LocalDateTime.class));
    }

    @Test
    @DisplayName("processBulkPayment: Verificare că nu crapă la listă goală (logica e în repo/db)")
    void processBulkPayment_EmptyList() {
        var req = new CateringOrderDTOs.BulkPayRequest(List.of());
        orderService.processBulkPayment(req);
        verify(orderRepository).markAsPaidBulk(eq(List.of()), any(LocalDateTime.class));
    }

    // --- 4. TESTE getDailyOrders ---

    @Test
    @DisplayName("getDailyOrders: Returnează lista de comenzi mapată corect")
    void getDailyOrders_ReturnsMappedList() {
        var date = LocalDate.now();
        var menu = CateringMenu.builder().id(1).name("Test").build();
        var order = CateringOrder.builder().id(5).menu(menu).orderDate(date).build();

        when(orderRepository.findByOrderDateOrderByCreatedAtAsc(date)).thenReturn(List.of(order));

        var result = orderService.getDailyOrders(date);

        assertFalse(result.isEmpty());
        assertEquals(5, result.get(0).id());
        assertEquals("Test", result.get(0).menuName());
    }

    @Test
    @DisplayName("getDailyOrders: Returnează listă goală dacă nu sunt comenzi")
    void getDailyOrders_EmptyResult() {
        LocalDate date = LocalDate.now();
        when(orderRepository.findByOrderDateOrderByCreatedAtAsc(date)).thenReturn(List.of());

        var result = orderService.getDailyOrders(date);

        assertTrue(result.isEmpty());
    }

    // --- 5. TESTE getUnpaidOrders ---

    @Test
    @DisplayName("getUnpaidOrders: Apelează repository cu intervalul corect")
    void getUnpaidOrders_CallsRepoWithInterval() {
        var start = LocalDate.now();
        var end = LocalDate.now().plusDays(7);
        when(orderRepository.findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(start, end)).thenReturn(List.of());

        orderService.getUnpaidOrders(start, end);

        verify(orderRepository).findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(start, end);
    }

    @Test
    @DisplayName("getUnpaidOrders: Mapare corectă a rezultatelor")
    void getUnpaidOrders_MappingCheck() {
        var start = LocalDate.now();
        var menu = CateringMenu.builder().id(1).name("Pizza").build();
        var order = CateringOrder.builder().id(10).menu(menu).isPaid(false).build();
        
        when(orderRepository.findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(any(), any())).thenReturn(List.of(order));

        var result = orderService.getUnpaidOrders(start, start);

        assertEquals(1, result.size());
        assertFalse(result.get(0).isPaid());
    }

    // --- 6. TESTE deleteOrder ---

    @Test
    @DisplayName("deleteOrder: Succes pentru comandă curentă")
    void deleteOrder_CurrentDate_Success() {
        var order = CateringOrder.builder().id(1).orderDate(LocalDate.now()).build();
        when(orderRepository.findById(1)).thenReturn(Optional.of(order));

        orderService.deleteOrder(1);

        verify(orderRepository).delete(order);
    }

    @Test
    @DisplayName("deleteOrder: Eroare la ștergerea unei comenzi din trecut")
    void deleteOrder_PastDate_ThrowsException() {
        var pastOrder = CateringOrder.builder().id(1).orderDate(LocalDate.now().minusDays(2)).build();
        when(orderRepository.findById(1)).thenReturn(Optional.of(pastOrder));

        RuntimeException ex = assertThrows(RuntimeException.class, () -> orderService.deleteOrder(1));
        assertEquals("ERROR.CATERING_ORDER.DELETE_FORBIDDEN_PAST_DATE", ex.getMessage());
    }
}
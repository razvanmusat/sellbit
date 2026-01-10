package com.sellbit.domain.catering.cateringorder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catering.cateringmenu.CateringMenu;
import com.sellbit.domain.catering.cateringmenu.CateringMenuRepository;
import com.sellbit.domain.playground.PlaygroundReservation;
import com.sellbit.domain.playground.PlaygroundReservationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CateringOrderService {

    private final CateringOrderRepository orderRepository;
    private final CateringMenuRepository menuRepository;
    private final PlaygroundReservationRepository reservationRepository;
    private final ProductRepository productRepository;
    
    @Transactional
    public CateringOrderDTOs.OrderResponse createOrder(CateringOrderDTOs.CreateOrderRequest req) {
        CateringMenu menu = menuRepository.findById(req.menuId())
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.MENU_NOT_FOUND"));

        // Dacă e comandă de la bar (fără rezervare), forțăm data de azi
        LocalDate finalOrderDate = (req.reservationId() == null) ? LocalDate.now() : req.orderDate();

        PlaygroundReservation res = null;
        if (req.reservationId() != null) {
            res = reservationRepository.getReferenceById(req.reservationId());
        }
        
        CateringOrder order = CateringOrder.builder()
                .menu(menu)
                .reservationId(res)
                .quantity(req.quantity())
                .orderDate(finalOrderDate)
                .isPaid(false)
                .build();

        CateringOrder saved = orderRepository.save(order);
        return mapToResponse(saved);
    }

    @Transactional
    public CateringOrderDTOs.OrderResponse updateOrder(Integer id, CateringOrderDTOs.CreateOrderRequest req) {
        CateringOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.NOT_FOUND"));

        // REGULA DE EDITARE BAZATĂ PE TIMP: 
        // Dacă data comenzii este anterioară zilei de azi, blocăm editarea.
        if (order.getOrderDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE");
        }

        CateringMenu menu = menuRepository.findById(req.menuId())
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.MENU_NOT_FOUND"));

        order.setMenu(menu);
        order.setQuantity(req.quantity());
        // Nu permitem schimbarea rezervării sau a datei după ce a fost creată pentru a păstra consistența grid-ului
        
        return mapToResponse(orderRepository.save(order));
    }

    @Transactional
    public void processBulkPayment(CateringOrderDTOs.BulkPayRequest req) {
        orderRepository.markAsPaidBulk(req.orderIds(), LocalDateTime.now());
    }

    public List<CateringOrderDTOs.OrderResponse> getDailyOrders(LocalDate date) {
        return orderRepository.findByOrderDateOrderByCreatedAtAsc(date).stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<CateringOrderDTOs.OrderResponse> getUnpaidOrders(LocalDate start, LocalDate end) {
        return orderRepository.findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(start, end).stream()
                .map(this::mapToResponse)
                .toList();
    }
    
    @Transactional
    public void deleteOrder(Integer id) {
        CateringOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.NOT_FOUND"));

        // Aplicăm aceeași regulă de protecție a istoricului
        if (order.getOrderDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("ERROR.CATERING_ORDER.DELETE_FORBIDDEN_PAST_DATE");
        }

        orderRepository.delete(order);
    }

    // --- HELPER MAPPING ---
    private CateringOrderDTOs.OrderResponse mapToResponse(CateringOrder o) {
        String productName = productRepository.findById(o.getMenu().getProductId())
                .map(com.sellbit.domain.catalog.product.Product::getName)
                .orElse("ERROR.PRODUCT.NOT_FOUND");

        return new CateringOrderDTOs.OrderResponse(
                o.getId(),
                o.getMenu().getId(),
                productName,
                o.getReservationId() != null ? o.getReservationId().getId() : null,
                o.getQuantity(),
                o.getOrderDate(),
                o.getIsPaid(),
                o.getPaidAt(),
                o.getCreatedAt()
        );
    }
}
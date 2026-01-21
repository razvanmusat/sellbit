package com.sellbit.domain.catering.cateringorder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductDTO;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.playground.PlaygroundReservation;
import com.sellbit.domain.playground.PlaygroundReservationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CateringOrderService {

    private final CateringOrderRepository orderRepository;
    private final PlaygroundReservationRepository reservationRepository;
    private final ProductRepository productRepository;
    
    @Transactional
    public CateringOrderDTOs.OrderResponse createOrder(CateringOrderDTOs.CreateOrderRequest req) {
        // Folosesc menuId() conform record-ului CreateOrderRequest trimis de tine
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.PRODUCT_NOT_FOUND"));

        LocalDate finalOrderDate = (req.reservationId() == null) ? LocalDate.now() : req.orderDate();

        PlaygroundReservation res = null;
        if (req.reservationId() != null) {
            res = reservationRepository.getReferenceById(req.reservationId());
        }
        
        CateringOrder order = CateringOrder.builder()
                .product(product)
                .reservationId(res)
                .quantity(req.quantity())
                .orderDate(finalOrderDate)
                .isPaid(false)
                .build();

        return mapToResponse(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public List<ProductDTO> getAvailableCateringProducts() {
    return productRepository.findAllCateringProducts().stream()
            .map(p -> new ProductDTO(
                p.getId(),
                p.getName(),
                p.getBarcode(),
                p.getCategory().getId(),
                p.getProductType().getId(),
                p.getUnit().getId(),
                p.getVatRate() != null ? p.getVatRate().getId() : null,
                p.getSalePrice(),
                p.getPurchasePrice(),
                p.getTrackStock(),
                p.getIsActive(),
                p.getCreatedAt(),
                p.getUpdatedAt()
            ))
            .toList();
}

    @Transactional
    public CateringOrderDTOs.OrderResponse updateOrder(Integer id, CateringOrderDTOs.CreateOrderRequest req) {
        CateringOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.NOT_FOUND"));

        if (order.getOrderDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE");
        }

        // Folosesc menuId() conform record-ului CreateOrderRequest trimis de tine
        Product product = productRepository.findById(req.productId())
                .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.PRODUCT_NOT_FOUND"));

        order.setProduct(product);
        order.setQuantity(req.quantity());
        
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

        if (order.getOrderDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("ERROR.CATERING_ORDER.DELETE_FORBIDDEN_PAST_DATE");
        }

        orderRepository.delete(order);
    }    

    private CateringOrderDTOs.OrderResponse mapToResponse(CateringOrder o) {
        // Mapare conform record OrderResponse: id, productId, productName, reservationId, quantity, orderDate, isPaid, paidAt, createdAt
        return new CateringOrderDTOs.OrderResponse(
                o.getId(),
                o.getProduct().getId(),
                o.getProduct().getName(),
                o.getReservationId() != null ? o.getReservationId().getId() : null,
                o.getQuantity(),
                o.getOrderDate(),
                o.getIsPaid(),
                o.getPaidAt(),
                o.getCreatedAt()
        );
    }
}
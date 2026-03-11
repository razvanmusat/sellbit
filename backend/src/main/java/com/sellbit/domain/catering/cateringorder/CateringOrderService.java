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
    public List<CateringOrderDTOs.OrderResponse> createOrder(List<CateringOrderDTOs.CreateOrderRequest> requests) {
        return requests.stream().map(req -> {
            // 1. Găsim produsul
            Product product = productRepository.findById(req.productId())
                    .orElseThrow(() -> new RuntimeException("ERROR.CATERING_ORDER.PRODUCT_NOT_FOUND"));

            // 2. Stabilim data (Azi dacă e fără rezervare, sau data trimisă dacă e cu
            // rezervare)
            LocalDate finalOrderDate = req.orderDate() != null
                    ? req.orderDate()
                    : LocalDate.now();

            if (finalOrderDate.isBefore(LocalDate.now())) {
                throw new RuntimeException("ERROR.CATERING_ORDER.CREATE_FORBIDDEN_PAST_DATE");
            }

            // 3. Găsim rezervarea (dacă există)
            PlaygroundReservation res = null;
            if (req.reservationId() != null) {
                res = reservationRepository.getReferenceById(req.reservationId());
            }

            // 4. Construim entitatea
            CateringOrder order = CateringOrder.builder()
                    .product(product)
                    .reservationId(res)
                    .quantity(req.quantity())
                    .orderDate(finalOrderDate)
                    .isPaid(false)
                    .build();

            // 5. Salvăm și returnăm DTO-ul
            return mapToResponse(orderRepository.save(order));
        }).toList();
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
                        p.getProductType().getCode(),
                        p.getUnit().getId(),
                        p.getVatRate() != null ? p.getVatRate().getId() : null,
                        p.getSalePrice(),
                        p.getPurchasePrice(),
                        p.getForcedWarehouse() != null ? p.getForcedWarehouse().getId() : null,
                        p.getTrackStock(),
                        p.getIsActive(),
                        p.getCreatedAt(),
                        p.getUpdatedAt()))
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

    // --- METODĂ PENTRU SINCRONIZARE DATĂ ---
    @Transactional
    public void moveOrdersToDate(Integer reservationId, LocalDate newDate) {        
        orderRepository.moveOrdersToDateJPQL(reservationId, newDate);
    }

    @Transactional
    public void processBulkPayment(CateringOrderDTOs.BulkPayRequest req) {
        orderRepository.markAsPaidBulk(req.orderIds(), LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public List<CateringOrderDTOs.OrderResponse> getDailyOrders(LocalDate date) {
        return orderRepository.findByOrderDateOrderByCreatedAtAsc(date).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CateringOrderDTOs.OrderResponse> getUnpaidOrders(LocalDate start, LocalDate end) {
        return orderRepository.findByIsPaidFalseAndOrderDateBetweenOrderByOrderDateAsc(start, end).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CateringOrderDTOs.OrderResponse> getPaidOrders(LocalDate start, LocalDate end) {
        // Convertim LocalDate (ziua) în interval de timp complet (început zi -> sfârșit zi)
        // Pentru că paidAt este LocalDateTime
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(23, 59, 59);

        // Căutăm după data PLĂȚII
        return orderRepository.findByIsPaidTrueAndPaidAtBetweenOrderByPaidAtDesc(startDateTime, endDateTime).stream()
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
        // Mapare conform record OrderResponse: id, productId, productName,
        // reservationId, quantity, orderDate, isPaid, paidAt, createdAt
        return new CateringOrderDTOs.OrderResponse(
                o.getId(),
                o.getProduct().getId(),
                o.getProduct().getName(),
                o.getReservationId() != null ? o.getReservationId().getId() : null,
                o.getReservationId() != null ? o.getReservationId().getParentName() : null,
                o.getReservationId() != null ? o.getReservationId().getNote() : null,
                o.getReservationId() != null ? o.getReservationId().getStartAt() : null,
                o.getQuantity(),
                o.getOrderDate(),
                o.getIsPaid(),
                o.getPaidAt(),
                o.getCreatedAt());
    }
}
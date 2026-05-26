package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.catalog.product.ProductService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.cancelreason.CancelReason;
import com.sellbit.domain.lookup.cancelreason.CancelReasonRepository;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethodRepository;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatusRepository;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.sales.receiptpayment.ReceiptPaymentRepository;
import com.sellbit.domain.security.user.User;
import com.sellbit.domain.security.user.UserRepository;
import com.sellbit.domain.store.Store;
import com.sellbit.domain.store.StoreRepository;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucher;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherRepository;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReceiptService {

        private final ReceiptRepository receiptRepository;
        private final WarehouseRepository warehouseRepository;
        private final ReceiptStatusRepository statusRepository;
        private final UserRepository userRepository;
        private final CancelReasonRepository cancelReasonRepository;
        private final StockCurrentService stockCurrentService;
        private final CashMovementService cashMovementService;
        private final ReceiptItemRepository itemRepository;
        private final PurchaseService purchaseService;
        private final CustomerVoucherRepository customerVoucherRepository;
        private final StoreRepository storeRepository;
        private final CustomerVoucherService voucherService;
        private final ReceiptPaymentRepository paymentRepository;
        private final PaymentMethodRepository paymentMethodRepository;
        private final ProductRepository productRepository;
        private final ProductService productService;

        @Transactional(readOnly = true)
        public ReceiptDTOs.Response getReceiptById(Integer id) {
                Receipt receipt = receiptRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
                return mapToResponse(receipt);
        }

        @Transactional(readOnly = true)
        public List<ReceiptDTOs.Response> getActiveReceipts() {
                return receiptRepository.findByStatus_Code("OPEN")
                                .stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<ReceiptDTOs.Response> getReceiptsReport(Integer warehouseId, String statusCode,
                        LocalDateTime start, LocalDateTime end) {
                return receiptRepository
                                .findByItemWarehouseAndStatusAndClosedAt(warehouseId, statusCode, start, end)
                                .stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<ReceiptDTOs.SummaryResponse> getReceiptsReportSummary(Integer warehouseId, String statusCode,
                        LocalDateTime start, LocalDateTime end) {
                return receiptRepository.findSummaryByWarehouseIdAndStatusCodeAndClosedAtBetween(
                                warehouseId, statusCode, start, end);
        }

        @Transactional
        public ReceiptDTOs.Response createReceipt(ReceiptDTOs.CreateRequest request) {
                ReceiptStatus openStatus = statusRepository.findByCode("OPEN")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                User user = request.userId() != null
                                ? userRepository.findById(request.userId()).orElse(null)
                                : null;

                Receipt receipt = Receipt.builder()
                                .warehouse(null)
                                .status(openStatus)
                                .tableName(request.tableName())
                                .user(user)
                                .note(request.note())
                                .totalAmount(BigDecimal.ZERO)
                                .totalNet(BigDecimal.ZERO)
                                .totalVat(BigDecimal.ZERO)
                                .build();

                return mapToResponse(receiptRepository.save(receipt));
        }

        @Transactional(readOnly = true)
        public List<ReceiptDTOs.UnclosedAlert> getUnclosedAlerts() {
                LocalDateTime startOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);

                return receiptRepository.findByStatus_Code("OPEN").stream()
                                .filter(r -> r.getCreatedAt().isBefore(startOfToday))
                                .map(r -> {
                                        String warehouseName = r.getItems().stream()
                                                        .findFirst()
                                                        .map(item -> item.getWarehouse() != null
                                                                        ? item.getWarehouse().getName()
                                                                        : "N/A")
                                                        .orElse("N/A");
                                        return new ReceiptDTOs.UnclosedAlert(
                                                        r.getId(),
                                                        r.getTableName(),
                                                        r.getCreatedAt(),
                                                        warehouseName);
                                })
                                .collect(Collectors.toList());
        }

        @Transactional
        public void cancelOpenReceipt(Integer receiptId, Integer reasonId) {
                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                if (!"OPEN".equals(receipt.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
                }

                if (receipt.getPayments() != null && !receipt.getPayments().isEmpty()) {
                        throw new RuntimeException("ERROR.RECEIPT.HAS_PAYMENTS_PLEASE_REFUND_FIRST");
                }

                CancelReason reason = cancelReasonRepository.findById(reasonId)
                                .orElseThrow(() -> new RuntimeException("ERROR.CANCEL_REASON.NOT_FOUND"));

                ReceiptStatus cancelledStatus = statusRepository.findByCode("CANCELLED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                for (ReceiptItem item : receipt.getItems()) {
                        Warehouse itemWarehouse = productService.resolveWarehouse(
                                        item.getProduct(), item.getWarehouse());
                        stockCurrentService.syncStockFromReceiptChange(
                                        itemWarehouse.getId(),
                                        item.getProduct().getId(),
                                        item.getQuantity(),
                                        BigDecimal.ZERO);
                }

                voucherService.cancelVoucherUsage(receiptId);

                receipt.setStatus(cancelledStatus);
                receipt.setCancelReason(reason);
                receipt.setClosedAt(LocalDateTime.now());
                receiptRepository.save(receipt);
        }

        @Transactional
        public com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs.VoucherIssuanceResult closeReceipt(Integer receiptId) {
                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                if (!"OPEN".equals(receipt.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
                }

                validateCateringPrices(receipt);

                BigDecimal paidAmount = receipt.getPayments().stream()
                                .map(ReceiptPayment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (paidAmount.compareTo(receipt.getTotalAmount()) != 0) {
                        throw new RuntimeException("ERROR.RECEIPT.INCOMPLETE_PAYMENT");
                }

                validateWarehousePaymentBalance(receipt);

                for (ReceiptItem item : receipt.getItems()) {
                        if (item.getQuantity().compareTo(BigDecimal.ZERO) != 0) {
                                Warehouse itemWarehouse = productService.resolveWarehouse(
                                                item.getProduct(), item.getWarehouse());

                                BigDecimal purchasePrice = purchaseService.consumeForReceiptItemAndRecord(
                                                itemWarehouse.getId(), receipt, item);

                                item.setPurchaseUnitPrice(purchasePrice);
                                itemRepository.save(item);
                        }
                }

                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                receipt.setStatus(closedStatus);
                receipt.setClosedAt(LocalDateTime.now());
                receiptRepository.save(receipt);

                return voucherService.checkAndIssueVouchers(receipt);
        }

        @Transactional
        public void updateReceiptTotals(Integer receiptId) {
                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                BigDecimal totalAmount = BigDecimal.ZERO;
                BigDecimal totalNet = BigDecimal.ZERO;
                BigDecimal totalVat = BigDecimal.ZERO;

                for (ReceiptItem item : receipt.getItems()) {
                        totalAmount = totalAmount.add(item.getLineTotal());
                        totalNet = totalNet.add(item.getNetTotal());
                        totalVat = totalVat.add(item.getVatTotal());
                }

                receipt.setTotalAmount(totalAmount);
                receipt.setTotalNet(totalNet);
                receipt.setTotalVat(totalVat);
                receiptRepository.save(receipt);
        }

        public ReceiptDTOs.Response mapToResponse(Receipt receipt) {
                List<ReceiptDTOs.ItemResponse> itemDTOs = receipt.getItems().stream()
                                .sorted(Comparator.comparing(ReceiptItem::getId))
                                .map(item -> new ReceiptDTOs.ItemResponse(
                                                item.getId(),
                                                item.getProduct().getId(),
                                                item.getProduct().getName(),
                                                item.getQuantity(),
                                                item.getUnitPrice(),
                                                item.getLineTotal(),
                                                item.getWarehouse() != null ? item.getWarehouse().getId() : null,
                                                item.getWarehouse() != null ? item.getWarehouse().getName() : null,
                                                Boolean.TRUE.equals(item.getProduct().getTrackStock())))
                                .collect(Collectors.toList());

                List<ReceiptDTOs.PaymentSummary> paymentDTOs = new ArrayList<>();
                if (receipt.getPayments() != null) {
                        paymentDTOs = receipt.getPayments().stream()
                                        .map(p -> {
                                                String info = null;
                                                if ("VOUCHER".equals(p.getPaymentMethod().getCode())) {
                                                        info = customerVoucherRepository
                                                                        .findByUsedReceiptId(receipt.getId())
                                                                        .map(CustomerVoucher::getCode)
                                                                        .orElse(null);
                                                }
                                                return new ReceiptDTOs.PaymentSummary(
                                                                p.getPaymentMethod().getCode(),
                                                                p.getPaymentMethod().getLabel(),
                                                                p.getAmount(),
                                                                info,
                                                                p.getWarehouse() != null ? p.getWarehouse().getId()
                                                                                : null,
                                                                p.getWarehouse() != null ? p.getWarehouse().getName()
                                                                                : null);
                                        })
                                        .collect(Collectors.toList());
                }

                String explanation;
                if (receipt.getOriginalReceipt() != null) {
                        explanation = "Stornare la Bon #" + receipt.getOriginalReceipt().getId();
                } else {
                        explanation = "Masa: " + receipt.getTableName();
                }

                String reasonLabel = (receipt.getCancelReason() != null)
                                ? receipt.getCancelReason().getLabel()
                                : null;

                String warehouseName = receipt.getItems().stream()
                                .findFirst()
                                .map(item -> item.getWarehouse() != null
                                                ? item.getWarehouse().getName()
                                                : "N/A")
                                .orElse("N/A");

                Integer warehouseId = receipt.getItems().stream()
                                .findFirst()
                                .map(item -> item.getWarehouse() != null
                                                ? item.getWarehouse().getId()
                                                : null)
                                .orElse(null);

                boolean hasVouchers = customerVoucherRepository.existsByIssuedReceiptId(receipt.getId());

                return new ReceiptDTOs.Response(
                                receipt.getId(),
                                receipt.getStatus().getLabel(),
                                explanation,
                                receipt.getTotalAmount(),
                                receipt.getTotalNet(),
                                receipt.getTotalVat(),
                                warehouseName,
                                warehouseId,
                                receipt.getUser() != null ? receipt.getUser().getFullName() : "N/A",
                                receipt.getCreatedAt(),
                                receipt.getClosedAt(),
                                receipt.getNote(),
                                reasonLabel,
                                receipt.getOriginalReceipt() != null ? receipt.getOriginalReceipt().getId() : null,
                                receipt.isInternalCorrection(),
                                itemDTOs,
                                paymentDTOs,
                                hasVouchers);
        }

        // Creează un bon de stornare (parțială sau totală).
        @Transactional
        public ReceiptDTOs.Response createPartialRefund(Integer originalReceiptId, ReceiptDTOs.RefundRequest request) {
                Receipt original = receiptRepository.findById(originalReceiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                if (!"CLOSED".equals(original.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.CANNOT_REFUND_NOT_CLOSED");
                }

                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                Receipt refundReceipt = Receipt.builder()
                                .warehouse(null)
                                .status(closedStatus)
                                .user(userRepository.getReferenceById(request.userId()))
                                .tableName("Retur Bon #" + original.getId())
                                .originalReceipt(original)
                                .note(request.note())
                                .totalAmount(BigDecimal.ZERO)
                                .totalNet(BigDecimal.ZERO)
                                .totalVat(BigDecimal.ZERO)
                                .closedAt(LocalDateTime.now())
                                .build();

                refundReceipt = receiptRepository.save(refundReceipt);

                BigDecimal tAmount = BigDecimal.ZERO;
                BigDecimal tNet = BigDecimal.ZERO;
                BigDecimal tVat = BigDecimal.ZERO;

                Map<Integer, BigDecimal> warehouseRefundTotals = new LinkedHashMap<>();

                for (ReceiptDTOs.RefundItemRequest itemReq : request.items()) {
                        ReceiptItem originalItem = original.getItems().stream()
                                        .filter(i -> i.getId().equals(itemReq.receiptItemId()))
                                        .findFirst()
                                        .orElseThrow(() -> new RuntimeException("ERROR.ITEM.NOT_FOUND"));

                        if (itemReq.quantityToRefund().compareTo(originalItem.getQuantity()) > 0) {
                                throw new RuntimeException("ERROR.REFUND.QUANTITY_EXCEEDED");
                        }

                        BigDecimal lineTotal = originalItem.getUnitPrice()
                                        .multiply(itemReq.quantityToRefund())
                                        .setScale(2, java.math.RoundingMode.HALF_UP)
                                        .negate();

                        BigDecimal vatFactor = originalItem.getVatRate()
                                        .divide(new BigDecimal("100"))
                                        .add(BigDecimal.ONE);
                        BigDecimal netTotal = lineTotal.divide(vatFactor, 2, java.math.RoundingMode.HALF_UP);
                        BigDecimal vatTotal = lineTotal.subtract(netTotal);

                        Warehouse itemWarehouse = productService.resolveWarehouse(
                                        originalItem.getProduct(), originalItem.getWarehouse());

                        ReceiptItem refundItem = ReceiptItem.builder()
                                        .product(originalItem.getProduct())
                                        .warehouse(originalItem.getWarehouse())
                                        .quantity(itemReq.quantityToRefund().negate())
                                        .unitPrice(originalItem.getUnitPrice())
                                        .purchaseUnitPrice(originalItem.getPurchaseUnitPrice())
                                        .vatRate(originalItem.getVatRate())
                                        .lineTotal(lineTotal)
                                        .netTotal(netTotal)
                                        .vatTotal(vatTotal)
                                        .build();

                        refundReceipt.addItem(refundItem);

                        // 1. Actualizează cantitatea curentă de stoc
                        stockCurrentService.syncStockFromReceiptChange(
                                        itemWarehouse.getId(),
                                        originalItem.getProduct().getId(),
                                        BigDecimal.ZERO,
                                        itemReq.quantityToRefund().negate());

                        // 2. Creează batch FIFO nou ca să poată fi revândut
                        purchaseService.createVirtualReturnBatch(
                                        itemWarehouse.getId(),
                                        originalItem.getProduct().getId(),
                                        request.userId(),
                                        itemReq.quantityToRefund(),
                                        "Retur Bon #" + original.getId());

                        warehouseRefundTotals.merge(
                                        itemWarehouse.getId(),
                                        lineTotal.abs(),
                                        BigDecimal::add);

                        tAmount = tAmount.add(lineTotal);
                        tNet = tNet.add(netTotal);
                        tVat = tVat.add(vatTotal);
                }

                refundReceipt.setTotalAmount(tAmount);
                refundReceipt.setTotalNet(tNet);
                refundReceipt.setTotalVat(tVat);

                PaymentMethod refundMethod = paymentMethodRepository.findById(request.paymentMethodId())
                                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

                String typeCode = "CASH".equals(refundMethod.getCode()) ? "REFUND" : "REFUND_CARD";
                BigDecimal totalRefund = tAmount.abs();

                // Cash movements per gestiune
                List<Map.Entry<Integer, BigDecimal>> entries = new ArrayList<>(warehouseRefundTotals.entrySet());
                BigDecimal allocated = BigDecimal.ZERO;

                for (int i = 0; i < entries.size(); i++) {
                        Integer whId = entries.get(i).getKey();
                        BigDecimal whTotal = entries.get(i).getValue();

                        BigDecimal movementAmount;
                        if (i == entries.size() - 1) {
                                movementAmount = totalRefund.subtract(allocated);
                        } else {
                                movementAmount = whTotal;
                                allocated = allocated.add(movementAmount);
                        }

                        if (movementAmount.compareTo(BigDecimal.ZERO) == 0)
                                continue;

                        cashMovementService.createMovement(
                                        whId,
                                        typeCode,
                                        movementAmount,
                                        request.userId(),
                                        "Stornare Bon #" + original.getId() + " (" + refundMethod.getLabel() + ")",
                                        original.getId());
                }

                // Plată per gestiune — câte una pentru fiecare gestiune returnată
                // astfel încât rapoartele să afișeze corect metoda și gestiunea
                for (Map.Entry<Integer, BigDecimal> entry : warehouseRefundTotals.entrySet()) {
                        Warehouse refundWarehouse = warehouseRepository.getReferenceById(entry.getKey());
                        ReceiptPayment refundPayment = ReceiptPayment.builder()
                                        .receipt(refundReceipt)
                                        .paymentMethod(refundMethod)
                                        .amount(entry.getValue().negate()) // negativ — e retur
                                        .warehouse(refundWarehouse)
                                        .paidAt(LocalDateTime.now())
                                        .build();
                        refundReceipt.addPayment(refundPayment);
                        paymentRepository.save(refundPayment);
                }

                return mapToResponse(receiptRepository.save(refundReceipt));
        }

        @Transactional(readOnly = true)
        public BigDecimal getGrossProfitReport(LocalDateTime start, LocalDateTime end, Integer warehouseId) {
                BigDecimal grossTheoreticalProfit = itemRepository.calculateTotalProfit(start, end, warehouseId);
                BigDecimal totalVouchers = paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId);
                return grossTheoreticalProfit.subtract(totalVouchers);
        }

        @Transactional(readOnly = true)
        public ReceiptPrintDTO getBillNoteData(Integer receiptId) {
                Store store = storeRepository.getSettings()
                                .orElseThrow(() -> new RuntimeException("ERROR.STORE.NOT_CONFIGURED"));

                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                BigDecimal totalVoucher = receipt.getPayments().stream()
                                .filter(p -> "VOUCHER".equals(p.getPaymentMethod().getCode()))
                                .map(ReceiptPayment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal paidOutOfPocket = receipt.getPayments().stream()
                                .filter(p -> !"VOUCHER".equals(p.getPaymentMethod().getCode()))
                                .map(ReceiptPayment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                if ("OPEN".equals(receipt.getStatus().getCode())) {
                        paidOutOfPocket = receipt.getTotalAmount().subtract(totalVoucher);
                }

                Optional<CustomerVoucher> voucherOpt = customerVoucherRepository.findByUsedReceiptId(receiptId);
                String usedVoucherCode = voucherOpt.map(CustomerVoucher::getCode).orElse(null);
                String campaignName = voucherOpt.map(v -> v.getCampaign().getName()).orElse(null);

                List<BillNoteItemDTO> items = receipt.getItems().stream()
                                .map(item -> new BillNoteItemDTO(
                                                item.getProduct().getName(),
                                                item.getQuantity(),
                                                item.getUnitPrice()))
                                .toList();

                return new ReceiptPrintDTO(
                                store.getName(),
                                store.getAddress(),
                                store.getPhone(),
                                items,
                                usedVoucherCode,
                                campaignName,
                                receipt.getTotalAmount(),
                                totalVoucher.compareTo(BigDecimal.ZERO) > 0 ? totalVoucher : null,
                                paidOutOfPocket,
                                receipt.getCreatedAt());
        }

        @Transactional
        public void registerAdvancePayment(Integer warehouseId, BigDecimal amount, String paymentMethodCode,
                        Integer userId, String note) {
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new RuntimeException("ERROR.ADVANCE.INVALID_AMOUNT");
                }
                if (warehouseId == null) {
                        throw new RuntimeException("ERROR.WAREHOUSE.ID_REQUIRED");
                }

                Warehouse warehouse = warehouseRepository.findById(warehouseId)
                                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

                Product advanceProduct = productRepository.findByProductTypeCode("ADVANCE")
                                .stream().findFirst()
                                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.ADVANCE_NOT_CONFIGURED"));

                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                PaymentMethod method = paymentMethodRepository.findByCode(paymentMethodCode)
                                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

                BigDecimal vatPercent = (advanceProduct.getVatRate() != null
                                && advanceProduct.getVatRate().getRate() != null)
                                                ? advanceProduct.getVatRate().getRate()
                                                : BigDecimal.ZERO;

                BigDecimal vatDivisor = BigDecimal.ONE
                                .add(vatPercent.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
                BigDecimal netAmount = amount.divide(vatDivisor, 2, RoundingMode.HALF_UP);
                BigDecimal vatAmount = amount.subtract(netAmount);

                Receipt receipt = Receipt.builder()
                                .warehouse(warehouse)
                                .user(user)
                                .status(closedStatus)
                                .tableName("Avans Petrecere")
                                .note(note)
                                .totalAmount(amount)
                                .totalNet(netAmount)
                                .totalVat(vatAmount)
                                .createdAt(LocalDateTime.now())
                                .closedAt(LocalDateTime.now())
                                .build();

                receipt = receiptRepository.save(receipt);

                ReceiptItem item = ReceiptItem.builder()
                                .product(advanceProduct)
                                .warehouse(warehouse)
                                .quantity(BigDecimal.ONE)
                                .unitPrice(amount)
                                .purchaseUnitPrice(BigDecimal.ZERO)
                                .vatRate(vatPercent)
                                .lineTotal(amount)
                                .netTotal(netAmount)
                                .vatTotal(vatAmount)
                                .isServiceTime(false)
                                .serviceEndAt(null)
                                .build();

                receipt.addItem(item);
                itemRepository.save(item);

                ReceiptPayment payment = ReceiptPayment.builder()
                                .paymentMethod(method)
                                .amount(amount)
                                .paidAt(LocalDateTime.now())
                                .warehouse(warehouse)
                                .build();

                receipt.addPayment(payment);
                paymentRepository.save(payment);

                if ("CASH".equals(paymentMethodCode)) {
                        String movementNote = "Incasare Avans (Bon #" + receipt.getId() + ")";
                        if (note != null && !note.isBlank()) {
                                movementNote += ": " + note;
                        }
                        cashMovementService.createMovement(
                                        warehouse.getId(),
                                        "SALE",
                                        amount,
                                        userId,
                                        movementNote,
                                        receipt.getId());
                }
        }

        /**
         * Vânzare card cadou: creează bon CLOSED (ca avans) + emite voucher FIXED cu suma specificată.
         */
        @Transactional
        public com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs.IssuedVoucherInfo registerGiftCardPayment(
                        Integer warehouseId, BigDecimal amount, String paymentMethodCode,
                        Integer userId, String note) {

                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new RuntimeException("ERROR.GIFT_CARD.INVALID_AMOUNT");
                }

                Warehouse warehouse = warehouseRepository.findById(warehouseId)
                                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

                Product giftCardProduct = productRepository.findByProductTypeCode("GIFT_CARD")
                                .stream().findFirst()
                                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.GIFT_CARD_NOT_CONFIGURED"));

                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                PaymentMethod method = paymentMethodRepository.findByCode(paymentMethodCode)
                                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

                BigDecimal vatPercent = (giftCardProduct.getVatRate() != null
                                && giftCardProduct.getVatRate().getRate() != null)
                                                ? giftCardProduct.getVatRate().getRate()
                                                : BigDecimal.ZERO;

                BigDecimal vatDivisor = BigDecimal.ONE
                                .add(vatPercent.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
                BigDecimal netAmount = amount.divide(vatDivisor, 2, RoundingMode.HALF_UP);
                BigDecimal vatAmount = amount.subtract(netAmount);

                Receipt receipt = Receipt.builder()
                                .warehouse(warehouse)
                                .user(user)
                                .status(closedStatus)
                                .tableName("Card Cadou")
                                .note(note)
                                .totalAmount(amount)
                                .totalNet(netAmount)
                                .totalVat(vatAmount)
                                .createdAt(LocalDateTime.now())
                                .closedAt(LocalDateTime.now())
                                .build();

                receipt = receiptRepository.save(receipt);

                ReceiptItem item = ReceiptItem.builder()
                                .product(giftCardProduct)
                                .warehouse(warehouse)
                                .quantity(BigDecimal.ONE)
                                .unitPrice(amount)
                                .purchaseUnitPrice(BigDecimal.ZERO)
                                .vatRate(vatPercent)
                                .lineTotal(amount)
                                .netTotal(netAmount)
                                .vatTotal(vatAmount)
                                .isServiceTime(false)
                                .serviceEndAt(null)
                                .build();

                receipt.addItem(item);
                itemRepository.save(item);

                ReceiptPayment payment = ReceiptPayment.builder()
                                .paymentMethod(method)
                                .amount(amount)
                                .paidAt(LocalDateTime.now())
                                .warehouse(warehouse)
                                .build();

                receipt.addPayment(payment);
                paymentRepository.save(payment);

                if ("CASH".equals(paymentMethodCode)) {
                        String movementNote = "Vanzare Card Cadou (Bon #" + receipt.getId() + ")";
                        if (note != null && !note.isBlank()) {
                                movementNote += ": " + note;
                        }
                        cashMovementService.createMovement(
                                        warehouse.getId(),
                                        "SALE",
                                        amount,
                                        userId,
                                        movementNote,
                                        receipt.getId());
                }

                // Emite voucherul cu valoarea din bon
                return voucherService.issueGiftCardVoucher(amount, receipt);
        }

        /**
         * Editare bon închis (doar admin).
         * 1. Stornează originalul în oglindă (per plată, per gestiune) — invizibil pentru user.
         * 2. Creează bon nou CLOSED cu aceleași produse/cantități dar gestiuni și plăți noi.
         * 3. Re-linkează voucherul (dacă exista) la bonul nou.
         * 4. Actualizează notele pe toate bonurile implicate.
         */
        @Transactional
        public ReceiptDTOs.Response editReceipt(Integer originalReceiptId,
                        ReceiptDTOs.EditReceiptRequest request, String adminUsername) {

                Receipt original = receiptRepository.findById(originalReceiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                if (!"CLOSED".equals(original.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.CANNOT_EDIT_NOT_CLOSED");
                }

                if (original.isInternalCorrection() || original.getOriginalReceipt() != null) {
                        throw new RuntimeException("ERROR.RECEIPT.CANNOT_EDIT_CORRECTION");
                }

                User admin = userRepository.findByUsername(adminUsername)
                                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

                // Vouchers de pe bonul original se auto-transferă pe bonul nou — user-ul NU
                // le poate re-aplica (sunt deja marcate used) și NU le poate respinge.
                boolean voucherInRequest = request.payments().stream()
                                .anyMatch(p -> "VOUCHER".equalsIgnoreCase(p.methodCode()));
                if (voucherInRequest) {
                        throw new RuntimeException("ERROR.RECEIPT.VOUCHER_AUTO_CARRIED");
                }

                List<ReceiptPayment> originalVoucherPayments = original.getPayments().stream()
                                .filter(p -> "VOUCHER".equals(p.getPaymentMethod().getCode()))
                                .collect(Collectors.toList());
                BigDecimal voucherTotal = originalVoucherPayments.stream()
                                .map(ReceiptPayment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                // Pre-validare: suma plăților noi + voucher auto-transferat = totalul bonului original
                BigDecimal newPaymentsTotal = request.payments().stream()
                                .map(ReceiptDTOs.EditPaymentRequest::amount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (newPaymentsTotal.add(voucherTotal).compareTo(original.getTotalAmount()) != 0) {
                        throw new RuntimeException("ERROR.RECEIPT.INCOMPLETE_PAYMENT");
                }

                // Rollback FIFO pe bonul original: restaurează cantitățile pe batch-urile reale
                // și șterge alocările. Asta permite bonului nou să consume FIFO la costurile reale.
                purchaseService.rollbackFifoForReceipt(originalReceiptId);

                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                // ── 1. BON STORNO ÎN OGLINDĂ ──────────────────────────────────────────────────
                Receipt stornoReceipt = Receipt.builder()
                                .warehouse(null)
                                .status(closedStatus)
                                .user(admin)
                                .tableName("Editare Bon #" + original.getId())
                                .originalReceipt(original)
                                .note("Editare bon #" + original.getId())
                                .internalCorrection(true)
                                .totalAmount(BigDecimal.ZERO)
                                .totalNet(BigDecimal.ZERO)
                                .totalVat(BigDecimal.ZERO)
                                .closedAt(LocalDateTime.now())
                                .build();

                stornoReceipt = receiptRepository.save(stornoReceipt);

                BigDecimal stornoAmount = BigDecimal.ZERO;
                BigDecimal stornoNet = BigDecimal.ZERO;
                BigDecimal stornoVat = BigDecimal.ZERO;

                for (ReceiptItem originalItem : original.getItems()) {
                        BigDecimal lineTotal = originalItem.getLineTotal() != null
                                        ? originalItem.getLineTotal().negate()
                                        : BigDecimal.ZERO;
                        BigDecimal netTotal = originalItem.getNetTotal() != null
                                        ? originalItem.getNetTotal().negate()
                                        : BigDecimal.ZERO;
                        BigDecimal vatTotal = originalItem.getVatTotal() != null
                                        ? originalItem.getVatTotal().negate()
                                        : BigDecimal.ZERO;

                        ReceiptItem stornoItem = ReceiptItem.builder()
                                        .product(originalItem.getProduct())
                                        .warehouse(originalItem.getWarehouse())
                                        .quantity(originalItem.getQuantity().negate())
                                        .unitPrice(originalItem.getUnitPrice())
                                        .purchaseUnitPrice(originalItem.getPurchaseUnitPrice())
                                        .vatRate(originalItem.getVatRate())
                                        .lineTotal(lineTotal)
                                        .netTotal(netTotal)
                                        .vatTotal(vatTotal)
                                        .isServiceTime(originalItem.isServiceTime())
                                        .serviceEndAt(originalItem.getServiceEndAt())
                                        .build();

                        stornoReceipt.addItem(stornoItem);

                        // Returnează stocul pe gestiunea originală.
                        // FIFO-ul a fost deja restaurat via rollbackFifoForReceipt (la începutul metodei),
                        // deci batch-urile reale sunt intacte — nu mai creăm virtualReturnBatch.
                        Warehouse origWarehouse = productService.resolveWarehouse(
                                        originalItem.getProduct(), originalItem.getWarehouse());
                        stockCurrentService.syncStockFromReceiptChange(
                                        origWarehouse.getId(),
                                        originalItem.getProduct().getId(),
                                        BigDecimal.ZERO,
                                        originalItem.getQuantity().negate());

                        stornoAmount = stornoAmount.add(lineTotal);
                        stornoNet = stornoNet.add(netTotal);
                        stornoVat = stornoVat.add(vatTotal);
                }

                stornoReceipt.setTotalAmount(stornoAmount);
                stornoReceipt.setTotalNet(stornoNet);
                stornoReceipt.setTotalVat(stornoVat);

                // Mișcări cash în oglindă — una per plată originală
                for (ReceiptPayment originalPayment : original.getPayments()) {
                        String methodCode = originalPayment.getPaymentMethod().getCode();
                        Integer whId = originalPayment.getWarehouse() != null
                                        ? originalPayment.getWarehouse().getId()
                                        : null;

                        String movementTypeCode = null;
                        if (("CASH".equals(methodCode) || "ADVANCE".equals(methodCode)) && whId != null) {
                                movementTypeCode = "REFUND";
                        } else if ("CARD".equals(methodCode) && whId != null) {
                                movementTypeCode = "REFUND_CARD";
                        }

                        if (movementTypeCode != null) {
                                cashMovementService.createMovement(
                                                whId,
                                                movementTypeCode,
                                                originalPayment.getAmount(),
                                                admin.getId(),
                                                "Storno editare Bon #" + original.getId(),
                                                original.getId());
                        }

                        ReceiptPayment stornoPayment = ReceiptPayment.builder()
                                        .receipt(stornoReceipt)
                                        .paymentMethod(originalPayment.getPaymentMethod())
                                        .amount(originalPayment.getAmount().negate())
                                        .warehouse(originalPayment.getWarehouse())
                                        .paidAt(LocalDateTime.now())
                                        .build();
                        stornoReceipt.addPayment(stornoPayment);
                        paymentRepository.save(stornoPayment);
                }

                receiptRepository.save(stornoReceipt);

                // ── 2. BON NOU CU DATELE CORECTATE ────────────────────────────────────────────
                Receipt newReceipt = Receipt.builder()
                                .warehouse(null)
                                .status(closedStatus)
                                .user(admin)
                                .tableName(original.getTableName())
                                .note(original.getNote())
                                .totalAmount(BigDecimal.ZERO)
                                .totalNet(BigDecimal.ZERO)
                                .totalVat(BigDecimal.ZERO)
                                .closedAt(LocalDateTime.now())
                                .build();

                newReceipt = receiptRepository.save(newReceipt);

                // Map receiptItemId -> newWarehouseId
                Map<Integer, Integer> itemWarehouseMap = new java.util.HashMap<>();
                for (ReceiptDTOs.EditItemRequest editItem : request.items()) {
                        itemWarehouseMap.put(editItem.receiptItemId(), editItem.newWarehouseId());
                }

                BigDecimal newTotal = BigDecimal.ZERO;
                BigDecimal newNet = BigDecimal.ZERO;
                BigDecimal newVat = BigDecimal.ZERO;

                for (ReceiptItem originalItem : original.getItems()) {
                        Integer newWhId = itemWarehouseMap.get(originalItem.getId());
                        if (newWhId == null) {
                                throw new RuntimeException("ERROR.ITEM.WAREHOUSE_NOT_PROVIDED");
                        }

                        Warehouse newWarehouse = warehouseRepository.findById(newWhId)
                                        .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

                        ReceiptItem newItem = ReceiptItem.builder()
                                        .product(originalItem.getProduct())
                                        .warehouse(newWarehouse)
                                        .quantity(originalItem.getQuantity())
                                        .unitPrice(originalItem.getUnitPrice())
                                        .vatRate(originalItem.getVatRate())
                                        .lineTotal(originalItem.getLineTotal())
                                        .netTotal(originalItem.getNetTotal())
                                        .vatTotal(originalItem.getVatTotal())
                                        .isServiceTime(originalItem.isServiceTime())
                                        .serviceEndAt(originalItem.getServiceEndAt())
                                        .build();

                        newReceipt.addItem(newItem);

                        // Scade stocul pe noua gestiune (simulează adăugarea pe bon deschis)
                        Warehouse resolvedNewWarehouse = productService.resolveWarehouse(
                                        originalItem.getProduct(), newWarehouse);
                        stockCurrentService.syncStockFromReceiptChange(
                                        resolvedNewWarehouse.getId(),
                                        originalItem.getProduct().getId(),
                                        BigDecimal.ZERO,
                                        originalItem.getQuantity());

                        // Consumă FIFO și înregistrează prețul de achiziție
                        BigDecimal purchasePrice = purchaseService.consumeForReceiptItemAndRecord(
                                        resolvedNewWarehouse.getId(), newReceipt, newItem);
                        newItem.setPurchaseUnitPrice(purchasePrice);
                        itemRepository.save(newItem);

                        newTotal = newTotal.add(originalItem.getLineTotal() != null
                                        ? originalItem.getLineTotal()
                                        : BigDecimal.ZERO);
                        newNet = newNet.add(originalItem.getNetTotal() != null
                                        ? originalItem.getNetTotal()
                                        : BigDecimal.ZERO);
                        newVat = newVat.add(originalItem.getVatTotal() != null
                                        ? originalItem.getVatTotal()
                                        : BigDecimal.ZERO);
                }

                newReceipt.setTotalAmount(newTotal);
                newReceipt.setTotalNet(newNet);
                newReceipt.setTotalVat(newVat);

                // Plăți noi
                for (ReceiptDTOs.EditPaymentRequest editPayment : request.payments()) {
                        PaymentMethod method = paymentMethodRepository.findByCode(editPayment.methodCode())
                                        .orElseThrow(() -> new RuntimeException(
                                                        "ERROR.PAYMENT_METHOD.NOT_FOUND"));

                        Warehouse paymentWarehouse = editPayment.warehouseId() != null
                                        ? warehouseRepository.findById(editPayment.warehouseId())
                                                        .orElseThrow(() -> new RuntimeException(
                                                                        "ERROR.WAREHOUSE.NOT_FOUND"))
                                        : null;

                        ReceiptPayment newPayment = ReceiptPayment.builder()
                                        .receipt(newReceipt)
                                        .paymentMethod(method)
                                        .amount(editPayment.amount())
                                        .warehouse(paymentWarehouse)
                                        .paidAt(LocalDateTime.now())
                                        .build();
                        newReceipt.addPayment(newPayment);
                        paymentRepository.save(newPayment);

                        if ("CASH".equals(editPayment.methodCode()) && paymentWarehouse != null) {
                                cashMovementService.createMovement(
                                                paymentWarehouse.getId(),
                                                "SALE",
                                                editPayment.amount(),
                                                admin.getId(),
                                                "Încasare bon corectat #" + newReceipt.getId()
                                                                + " (edit Bon #" + original.getId() + ")",
                                                newReceipt.getId());
                        }
                }

                // Auto-transfer voucher: copiem plățile VOUCHER de pe bonul original pe cel nou.
                // Warehouse-ul original nu mai are relevanță (item-urile pot fi pe alte gestiuni),
                // deci setăm warehouse=null — declanșează fallback-ul din validateWarehousePaymentBalance.
                // §3 mai jos re-linkează CustomerVoucher.usedReceipt la bonul nou.
                for (ReceiptPayment originalVoucher : originalVoucherPayments) {
                        ReceiptPayment voucherPayment = ReceiptPayment.builder()
                                        .receipt(newReceipt)
                                        .paymentMethod(originalVoucher.getPaymentMethod())
                                        .amount(originalVoucher.getAmount())
                                        .warehouse(null)
                                        .paidAt(LocalDateTime.now())
                                        .build();
                        newReceipt.addPayment(voucherPayment);
                        paymentRepository.save(voucherPayment);
                }

                receiptRepository.save(newReceipt);

                // ── 3. RE-LINK VOUCHER ─────────────────────────────────────────────────────────
                Receipt finalNewReceipt = newReceipt;
                customerVoucherRepository.findByUsedReceiptId(originalReceiptId).ifPresent(voucher -> {
                        voucher.setUsedReceipt(finalNewReceipt);
                        voucher.setUsedAt(LocalDateTime.now());
                        customerVoucherRepository.save(voucher);
                });

                // ── 4. VALIDARE PER GESTIUNE (safety net) ─────────────────────────────────────
                validateWarehousePaymentBalance(newReceipt);

                // ── 5. MARCHEAZĂ ORIGINALUL CA CORECTAT (exclus din rapoarte) ─────────────────
                original.setInternalCorrection(true);
                receiptRepository.save(original);

                return mapToResponse(newReceipt);
        }

        /**
         * Plasă de siguranță la close: pe fiecare gestiune afectată,
         * suma items-urilor trebuie să fie egală cu suma plăților.
         *
         * Invariantul e deja prevenit în ReceiptItemService (nu lași operațiuni care îl sparg),
         * dar validarea aici protejează împotriva oricărei căi viitoare care l-ar ocoli.
         *
         * Dacă există plăți fără gestiune (voucher-fallback), sărim verificarea — totalul
         * global a fost deja validat mai sus și nu avem cum distribui precis per gestiune.
         */
        private void validateWarehousePaymentBalance(Receipt receipt) {
                boolean hasUnassignedPayment = receipt.getPayments().stream()
                                .anyMatch(p -> p.getWarehouse() == null);
                if (hasUnassignedPayment) return;

                Map<Integer, BigDecimal> itemsByWh = new LinkedHashMap<>();
                for (ReceiptItem item : receipt.getItems()) {
                        if (item.getWarehouse() == null) continue;
                        BigDecimal line = item.getLineTotal() != null ? item.getLineTotal() : BigDecimal.ZERO;
                        itemsByWh.merge(item.getWarehouse().getId(), line, BigDecimal::add);
                }

                Map<Integer, BigDecimal> paymentsByWh = new LinkedHashMap<>();
                for (ReceiptPayment payment : receipt.getPayments()) {
                        paymentsByWh.merge(payment.getWarehouse().getId(), payment.getAmount(), BigDecimal::add);
                }

                java.util.Set<Integer> allWhs = new java.util.HashSet<>();
                allWhs.addAll(itemsByWh.keySet());
                allWhs.addAll(paymentsByWh.keySet());

                BigDecimal tolerance = new BigDecimal("0.01");
                for (Integer whId : allWhs) {
                        BigDecimal items = itemsByWh.getOrDefault(whId, BigDecimal.ZERO);
                        BigDecimal payments = paymentsByWh.getOrDefault(whId, BigDecimal.ZERO);
                        if (items.subtract(payments).abs().compareTo(tolerance) > 0) {
                                throw new RuntimeException("ERROR.RECEIPT.WAREHOUSE_PAYMENT_MISMATCH");
                        }
                }
        }

        private void validateCateringPrices(Receipt receipt) {
                for (ReceiptItem item : receipt.getItems()) {
                        Product product = item.getProduct();
                        if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {
                                if (product.getPurchasePrice() == null) {
                                        throw new RuntimeException("ERROR.CATERING.PURCHASE_PRICE_NULL");
                                }
                        }
                }
        }
}
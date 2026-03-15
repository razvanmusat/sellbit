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

        // OPERAȚIONAL: Toate bonurile deschise, fără filtru pe gestiune.
        @Transactional(readOnly = true)
        public List<ReceiptDTOs.Response> getActiveReceipts() {
                return receiptRepository.findByStatus_Code("OPEN")
                                .stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        // RAPORTARE: Istoric bonuri filtrate după gestiunea liniilor.
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

        // Deschide un bon nou (status OPEN) — fără gestiune pe header.
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

        // Returnează bonurile deschise din zilele anterioare (Alerte UX).
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

        // Anulează un bon deschis și returnează stocul live.
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

        // Finalizează vânzarea, verifică plățile și descarcă gestiunea (FIFO).
        // Mișcările de numerar sunt deja create de ReceiptPaymentService.addPayment —
        // nu se mai creează aici pentru a evita dublarea.
        @Transactional
        public void closeReceipt(Integer receiptId) {
                // 1. Căutăm bonul
                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                // 2. Validăm statusul
                if (!"OPEN".equals(receipt.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
                }

                validateCateringPrices(receipt);

                // 3. Validăm plățile
                BigDecimal paidAmount = receipt.getPayments().stream()
                                .map(ReceiptPayment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (paidAmount.compareTo(receipt.getTotalAmount()) != 0) {
                        throw new RuntimeException("ERROR.RECEIPT.INCOMPLETE_PAYMENT");
                }

                // 4. DESCĂRCARE GESTIUNE (FIFO) — warehouse vine de pe linie
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

                // 5. Finalizare status
                // Mișcările cash NU se mai creează aici — sunt deja înregistrate
                // în ReceiptPaymentService.addPayment la momentul plății.
                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                receipt.setStatus(closedStatus);
                receipt.setClosedAt(LocalDateTime.now());

                // 6. Salvare finală
                receiptRepository.save(receipt);

                // 7. Emitere VOUCHERE
                voucherService.checkAndIssueVouchers(receipt);
        }

        // Recalculează header-ul bonului (apelată din ReceiptItemService).
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

        // Mapper pentru Response DTO.
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
                                                item.getWarehouse() != null ? item.getWarehouse().getName() : null))
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
                                itemDTOs,
                                paymentDTOs);
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

                // Split refund proporțional pe gestiunile returnate (ultima primește restul
                // exact)
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

                Warehouse refundWarehouse = warehouseRefundTotals.isEmpty() ? null
                                : warehouseRepository
                                                .getReferenceById(warehouseRefundTotals.keySet().iterator().next());

                ReceiptPayment refundPayment = ReceiptPayment.builder()
                                .receipt(refundReceipt)
                                .paymentMethod(refundMethod)
                                .amount(tAmount)
                                .warehouse(refundWarehouse)
                                .paidAt(LocalDateTime.now())
                                .build();

                refundReceipt.addPayment(refundPayment);
                paymentRepository.save(refundPayment);

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

        // Înregistrează un AVANS rapid.
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
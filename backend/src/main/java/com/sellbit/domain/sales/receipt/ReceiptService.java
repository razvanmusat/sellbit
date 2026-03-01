package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
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
        private final com.sellbit.domain.catalog.productcomposite.ProductComponentRepository productComponentRepository;

        @Transactional(readOnly = true)
        public ReceiptDTOs.Response getReceiptById(Integer id) {
                Receipt receipt = receiptRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                return mapToResponse(receipt);
        }

        // OPERAȚIONAL: Pentru afișarea meselor/bonurilor deschise în tab-ul din React.
        @Transactional(readOnly = true)
        public List<ReceiptDTOs.Response> getActiveReceipts(Integer warehouseId) {
                return receiptRepository.findByWarehouseIdAndStatus_Code(warehouseId, "OPEN")
                                .stream()
                                .map(this::mapToResponse)
                                .collect(Collectors.toList());
        }

        // RAPORTARE: Istoric bonuri pe gestiune, status și perioadă.
        @Transactional(readOnly = true)
        public List<ReceiptDTOs.Response> getReceiptsReport(Integer warehouseId, String statusCode, LocalDateTime start,
                        LocalDateTime end) {
                return receiptRepository
                                .findByWarehouseIdAndStatus_CodeAndClosedAtBetween(warehouseId, statusCode, start, end)
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

        // Deschide un bon nou (status OPEN).
        @Transactional
        public ReceiptDTOs.Response createReceipt(ReceiptDTOs.CreateRequest request) {
                Warehouse warehouse = warehouseRepository.findById(request.warehouseId())
                                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

                ReceiptStatus openStatus = statusRepository.findByCode("OPEN")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                User user = request.userId() != null ? userRepository.findById(request.userId()).orElse(null) : null;

                Receipt receipt = Receipt.builder()
                                .warehouse(warehouse)
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
                                .map(r -> new ReceiptDTOs.UnclosedAlert(
                                                r.getId(),
                                                r.getTableName(),
                                                r.getCreatedAt(),
                                                r.getWarehouse().getName()))
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

                // Returnăm produsele în stoc folosind metoda ta de sync
                for (ReceiptItem item : receipt.getItems()) {
                        stockCurrentService.syncStockFromReceiptChange(
                                        receipt.getWarehouse().getId(),
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

        // Această metodă finalizează vânzarea, verifică plățile și descarcă
        // gestiunea(FIFO).
        @Transactional
        public void closeReceipt(Integer receiptId) {
                // 1. Căutăm bonul
                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                // 2. Validăm statusul (doar bonurile OPEN pot fi închise)
                if (!"OPEN".equals(receipt.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
                }
                // Ne asigurăm că adminul nu a uitat să pună prețurile de achiziție
                validateCateringPrices(receipt);
                // 3. Validăm plățile
                BigDecimal paidAmount = receipt.getPayments().stream()
                                .map(ReceiptPayment::getAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (paidAmount.compareTo(receipt.getTotalAmount()) != 0) {
                        throw new RuntimeException("ERROR.RECEIPT.INCOMPLETE_PAYMENT");
                }

                // 4. DESCĂRCARE GESTIUNE (FIFO)
                // Stocul curent (HUB) a fost deja scăzut la "addOrUpdateItem" (sync).
                // Aici doar marcăm consumul loturilor de achiziție pentru profit.
                for (ReceiptItem item : receipt.getItems()) {
                        if (item.getQuantity().compareTo(BigDecimal.ZERO) != 0) {

                                // 1. Iei prețul de achiziție FIFO la momentul închiderii
                                BigDecimal purchasePrice = purchaseService.getCurrentFIFOPurchasePrice(
                                                receipt.getWarehouse().getId(),
                                                item.getProduct().getId());

                                // 2. Îl salvezi pe linie (Aici se "bate în cuie" profitul)
                                item.setPurchaseUnitPrice(purchasePrice);
                                itemRepository.save(item);
                                // 3. Descarci gestiunea (FIFO)
                                purchaseService.deductFromBatchesFIFO(
                                                receipt.getWarehouse().getId(),
                                                item.getProduct().getId(),
                                                item.getQuantity());
                        }
                }

                // 5. Finalizare status
                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                receipt.setStatus(closedStatus);
                receipt.setClosedAt(LocalDateTime.now());

                // 6. Salvare finală
                receiptRepository.save(receipt);

                // Emitere VOUCHERE
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
                                                item.getLineTotal()))
                                .collect(Collectors.toList());

                List<ReceiptDTOs.PaymentSummary> paymentDTOs = new ArrayList<>();
                if (receipt.getPayments() != null) {
                        paymentDTOs = receipt.getPayments().stream()
                                        .map(p -> {
                                                String info = null;

                                                // LOGICA: Dacă e Voucher, caută codul
                                                if ("VOUCHER".equals(p.getPaymentMethod().getCode())) {
                                                        // Căutăm voucherul care a fost consumat de acest bon
                                                        info = customerVoucherRepository
                                                                        .findByUsedReceiptId(receipt.getId())
                                                                        .map(CustomerVoucher::getCode) // Luăm doar
                                                                                                       // codul (ex:
                                                                                                       // "SUMMER20")
                                                                        .orElse(null);
                                                }

                                                // Aici poți adăuga pe viitor logică pentru Card (ex: last 4 digits)

                                                return new ReceiptDTOs.PaymentSummary(
                                                                p.getPaymentMethod().getCode(),
                                                                p.getPaymentMethod().getLabel(),
                                                                p.getAmount(),
                                                                info // <--- Trimitem informația extra
                                                );
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
                return new ReceiptDTOs.Response(
                                receipt.getId(),
                                receipt.getStatus().getLabel(),
                                explanation,
                                receipt.getTotalAmount(),
                                receipt.getTotalNet(),
                                receipt.getTotalVat(),
                                receipt.getWarehouse().getName(),
                                receipt.getWarehouse().getId(),
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
                // 1. Validăm bonul original
                Receipt original = receiptRepository.findById(originalReceiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                if (!"CLOSED".equals(original.getStatus().getCode())) {
                        throw new RuntimeException("ERROR.RECEIPT.CANNOT_REFUND_NOT_CLOSED");
                }

                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                // 2. Creăm Header-ul bonului de stornare (User-ul e acum garantat de DTO)
                Receipt refundReceipt = Receipt.builder()
                                .warehouse(original.getWarehouse())
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

                // 3. Procesăm produsele (Calcul chirurgical)
                for (ReceiptDTOs.RefundItemRequest itemReq : request.items()) {
                        ReceiptItem originalItem = original.getItems().stream()
                                        .filter(i -> i.getId().equals(itemReq.receiptItemId()))
                                        .findFirst()
                                        .orElseThrow(() -> new RuntimeException("ERROR.ITEM.NOT_FOUND"));

                        if (itemReq.quantityToRefund().compareTo(originalItem.getQuantity()) > 0) {
                                throw new RuntimeException("ERROR.REFUND.QUANTITY_EXCEEDED");
                        }

                        // --- CALCUL PRECIS FĂRĂ RATIO ---
                        // Înmulțim prețul unitar (care include deja rotunjirile legale de la vânzare)
                        // cu cantitatea de retur
                        BigDecimal lineTotal = originalItem.getUnitPrice()
                                        .multiply(itemReq.quantityToRefund())
                                        .setScale(2, java.math.RoundingMode.HALF_UP)
                                        .negate();

                        // Calculăm Net și TVA proporțional cu noul Total ca să păstrăm cota de TVA
                        // intactă
                        BigDecimal vatFactor = originalItem.getVatRate().divide(new BigDecimal("100"))
                                        .add(BigDecimal.ONE);
                        BigDecimal netTotal = lineTotal.divide(vatFactor, 2, java.math.RoundingMode.HALF_UP);
                        BigDecimal vatTotal = lineTotal.subtract(netTotal);

                        ReceiptItem refundItem = ReceiptItem.builder()
                                        .product(originalItem.getProduct())
                                        .quantity(itemReq.quantityToRefund().negate())
                                        .unitPrice(originalItem.getUnitPrice())
                                        .purchaseUnitPrice(originalItem.getPurchaseUnitPrice()) // Păstrăm prețul de
                                                                                                // achiziție original
                                                                                                // pentru profit corect
                                        .vatRate(originalItem.getVatRate())
                                        .lineTotal(lineTotal)
                                        .netTotal(netTotal)
                                        .vatTotal(vatTotal)
                                        .build();

                        refundReceipt.addItem(refundItem);
                        stockCurrentService.syncStockFromReceiptChange(
                                        original.getWarehouse().getId(),
                                        originalItem.getProduct().getId(),
                                        BigDecimal.ZERO,
                                        itemReq.quantityToRefund().negate());
                        tAmount = tAmount.add(lineTotal);
                        tNet = tNet.add(netTotal);
                        tVat = tVat.add(vatTotal);
                }

                refundReceipt.setTotalAmount(tAmount);
                refundReceipt.setTotalNet(tNet);
                refundReceipt.setTotalVat(tVat);

                // 4. Logica de bani (Cash Movement)
                PaymentMethod refundMethod = paymentMethodRepository.findById(request.paymentMethodId())
                                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

                String typeCode = "CASH".equals(refundMethod.getCode()) ? "REFUND" : "REFUND_CARD";

                // Înregistrăm o singură mișcare, pe metoda aleasă de tine
                cashMovementService.createMovement(
                                original.getWarehouse().getId(),
                                typeCode,
                                tAmount.abs(),
                                request.userId(),
                                "Stornare Bon #" + original.getId() + " (" + refundMethod.getLabel() + ")");

                ReceiptPayment refundPayment = ReceiptPayment.builder()
                                .receipt(refundReceipt)
                                .paymentMethod(refundMethod)
                                .amount(tAmount)
                                .paidAt(LocalDateTime.now())
                                .build();

                refundReceipt.addPayment(refundPayment);
                paymentRepository.save(refundPayment);

                return mapToResponse(receiptRepository.save(refundReceipt));
        }

        @Transactional(readOnly = true)
        public BigDecimal getGrossProfitReport(LocalDateTime start, LocalDateTime end, Integer warehouseId) {
                // 1. Profitul brut teoretic (din linii)
                BigDecimal grossTheoreticalProfit = itemRepository.calculateTotalProfit(start, end, warehouseId);

                // 2. Suma discount-urilor oferite prin vouchere (plăți virtuale)
                // Presupunem că ai injectat paymentRepository în ReceiptService
                BigDecimal totalVouchers = paymentRepository.getTotalVoucherDiscounts(start, end, warehouseId);

                // 3. Profitul real = Profit Linii - Valoare Vouchere
                return grossTheoreticalProfit.subtract(totalVouchers);
        }

        @Transactional(readOnly = true)
        public ReceiptPrintDTO getBillNoteData(Integer receiptId) {
                Store store = storeRepository.getSettings()
                                .orElseThrow(() -> new RuntimeException("ERROR.STORE.NOT_CONFIGURED"));

                Receipt receipt = receiptRepository.findById(receiptId)
                                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                // Calcule plăți
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

                // Extragere Voucher & Campanie
                Optional<CustomerVoucher> voucherOpt = customerVoucherRepository.findByUsedReceiptId(receiptId);
                String usedVoucherCode = voucherOpt.map(CustomerVoucher::getCode).orElse(null);
                String campaignName = voucherOpt.map(v -> v.getCampaign().getName()).orElse(null);

                // Mapare produse
                List<BillNoteItemDTO> items = receipt.getItems().stream()
                                .map(item -> new BillNoteItemDTO(
                                                item.getProduct().getName(),
                                                item.getQuantity(),
                                                item.getUnitPrice()))
                                .toList();

                // RETURN cu mapare pe index (respectând ordinea ta din record)
                return new ReceiptPrintDTO(
                                store.getName(), // 1
                                store.getAddress(), // 2
                                store.getPhone(), // 3
                                items, // 4
                                usedVoucherCode, // 5 (voucherCode)
                                campaignName, // 6 (voucherCampaignName)
                                receipt.getTotalAmount(), // 7 (subtotal)
                                totalVoucher.compareTo(BigDecimal.ZERO) > 0 ? totalVoucher : null, // 8 (voucherValue)
                                paidOutOfPocket, // 9 (totalToPay)
                                receipt.getCreatedAt() // 10
                );
        }

        // Înregistrează un AVANS rapid (Bon Închis + Produs Avans + Plată +
        // CashMovement).
        @Transactional
        public void registerAdvancePayment(Integer warehouseId, BigDecimal amount, String paymentMethodCode,
                        Integer userId, String note) {
                // 1. Validări
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new RuntimeException("ERROR.ADVANCE.INVALID_AMOUNT");
                }
                if (warehouseId == null) {
                        throw new RuntimeException("ERROR.WAREHOUSE.ID_REQUIRED");
                }

                // 2. Recuperare Entități (Folosind repo-urile injectate deja în clasa ta)
                Warehouse warehouse = warehouseRepository.findById(warehouseId)
                                .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("ERROR.USER.NOT_FOUND"));

                // Folosim metoda ta custom din ProductRepository (trebuie injectat sus!)
                Product advanceProduct = productRepository.findByProductTypeCode("ADVANCE")
                                .stream().findFirst()
                                .orElseThrow(() -> new RuntimeException("ERROR.PRODUCT.ADVANCE_NOT_CONFIGURED"));

                // Variabila ta se numește statusRepository
                ReceiptStatus closedStatus = statusRepository.findByCode("CLOSED")
                                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

                PaymentMethod method = paymentMethodRepository.findByCode(paymentMethodCode)
                                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT_METHOD.NOT_FOUND"));

                // 3. Calcul Matematic (Extragere TVA din Brut)
                // Luăm rata TVA direct din entitatea Product -> VatRate
                BigDecimal vatPercent = (advanceProduct.getVatRate() != null
                                && advanceProduct.getVatRate().getRate() != null)
                                                ? advanceProduct.getVatRate().getRate()
                                                : BigDecimal.ZERO;

                // Formula: Net = Brut / (1 + Cota/100)
                BigDecimal vatDivisor = BigDecimal.ONE
                                .add(vatPercent.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP));
                BigDecimal netAmount = amount.divide(vatDivisor, 2, RoundingMode.HALF_UP);
                BigDecimal vatAmount = amount.subtract(netAmount);

                // 4. Creare Bon (Receipt)
                Receipt receipt = Receipt.builder()
                                .warehouse(warehouse)
                                .user(user)
                                .status(closedStatus)
                                .tableName("Avans Petrecere") // Marker vizual
                                .note(note)
                                .totalAmount(amount)
                                .totalNet(netAmount)
                                .totalVat(vatAmount)
                                .createdAt(LocalDateTime.now())
                                .closedAt(LocalDateTime.now())
                                .build();

                receipt = receiptRepository.save(receipt);

                // 5. Creare Linie (ReceiptItem)
                ReceiptItem item = ReceiptItem.builder()
                                // receipt se setează prin addItem
                                .product(advanceProduct)
                                .quantity(BigDecimal.ONE)
                                .unitPrice(amount)
                                .purchaseUnitPrice(BigDecimal.ZERO) // Fără cost de achiziție
                                .vatRate(vatPercent)
                                .lineTotal(amount)
                                .netTotal(netAmount)
                                .vatTotal(vatAmount)
                                .isServiceTime(false) // EXPLICIT FALSE
                                .serviceEndAt(null) // EXPLICIT NULL
                                .build();

                receipt.addItem(item);
                itemRepository.save(item);

                // 6. Creare Plată (ReceiptPayment)
                ReceiptPayment payment = ReceiptPayment.builder()
                                // receipt se setează prin addPayment
                                .paymentMethod(method)
                                .amount(amount)
                                .paidAt(LocalDateTime.now())
                                .build();

                receipt.addPayment(payment);
                paymentRepository.save(payment);

                // 7. Mișcare Numerar (Dacă e CASH)
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
                                        movementNote);
                }
        }

        /**
         * Schimbă gestiunea unui bon închis, cu actualizare corectă a stocurilor.
         * @param receiptId id-ul bonului
         * @param newWarehouseId id-ul gestiunii noi
         */
        @Transactional
        public void changeReceiptWarehouse(Integer receiptId, Integer newWarehouseId) {
                // 1. Caută bonul
                Receipt receipt = receiptRepository.findById(receiptId)
                    .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

                // 2. Verifică statusul
                if (!"CLOSED".equals(receipt.getStatus().getCode())) {
                    throw new RuntimeException("ERROR.RECEIPT.NOT_CLOSED");
                }

                // 3. Caută gestiunea nouă
                Warehouse newWarehouse = warehouseRepository.findById(newWarehouseId)
                    .orElseThrow(() -> new RuntimeException("ERROR.WAREHOUSE.NOT_FOUND"));
                Warehouse oldWarehouse = receipt.getWarehouse();

                // 4. Verifică stocul pentru toate produsele în gestiunea nouă
                                List<String> insufficientProducts = new ArrayList<>();
                                for (ReceiptItem item : receipt.getItems()) {
                                        Product product = item.getProduct();
                                        List<com.sellbit.domain.catalog.productcomposite.ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(product.getId());
                                        if (!components.isEmpty()) {
                                                for (com.sellbit.domain.catalog.productcomposite.ProductComponent comp : components) {
                                                        Product child = comp.getChildProduct();
                                                        if (Boolean.TRUE.equals(child.getTrackStock())) {
                                                                BigDecimal requiredQty = item.getQuantity().multiply(comp.getQuantity());
                                                                BigDecimal stockInNew = stockCurrentService.getQuantity(newWarehouseId, child.getId());
                                                                if (stockInNew.compareTo(requiredQty) < 0) {
                                                                        insufficientProducts.add(child.getName());
                                                                }
                                                        }
                                                }
                                        } else if (Boolean.TRUE.equals(product.getTrackStock()) && components.isEmpty()) {
                                                BigDecimal qty = item.getQuantity();
                                                Integer productId = product.getId();
                                                BigDecimal stockInNew = stockCurrentService.getQuantity(newWarehouseId, productId);
                                                if (stockInNew.compareTo(qty) < 0) {
                                                        insufficientProducts.add(product.getName());
                                                }
                                        }
                                }
                                if (!insufficientProducts.isEmpty()) {
                                        throw new com.sellbit.domain.config.InsufficientStockException(insufficientProducts);
                                }

                // 5. Actualizează stocurile
                                for (ReceiptItem item : receipt.getItems()) {
                                        Product product = item.getProduct();
                                        List<com.sellbit.domain.catalog.productcomposite.ProductComponent> components = productComponentRepository.findByParentProductIdAndIsActiveTrue(product.getId());
                                        if (!components.isEmpty()) {
                                                // Produs compus: actualizez stocul pentru fiecare componentă
                                                for (com.sellbit.domain.catalog.productcomposite.ProductComponent comp : components) {
                                                        Product child = comp.getChildProduct();
                                                        if (Boolean.TRUE.equals(child.getTrackStock())) {
                                                                BigDecimal requiredQty = item.getQuantity().multiply(comp.getQuantity());
                                                                // Adaugă în gestiunea veche
                                                                stockCurrentService.updateStockRelative(oldWarehouse.getId(), child.getId(), requiredQty);
                                                                // Scade din gestiunea nouă
                                                                stockCurrentService.updateStockRelative(newWarehouseId, child.getId(), requiredQty.negate());
                                                        }
                                                }
                                        } else if (Boolean.TRUE.equals(product.getTrackStock())) {
                                                BigDecimal qty = item.getQuantity();
                                                Integer productId = product.getId();
                                                // Adaugă în gestiunea veche
                                                stockCurrentService.updateStockRelative(oldWarehouse.getId(), productId, qty);
                                                // Scade din gestiunea nouă
                                                stockCurrentService.updateStockRelative(newWarehouseId, productId, qty.negate());
                                        }
                                }

                // 6. Schimbă gestiunea bonului
                receipt.setWarehouse(newWarehouse);

                // 7. Adaugă flag în notă
                String note = receipt.getNote() != null ? receipt.getNote() : "";
                if (!note.contains(" sch gest")) {
                    note = note + (note.isEmpty() ? "" : " ") + " sch gest";
                }
                receipt.setNote(note);

                // 8. Salvează bonul
                receiptRepository.save(receipt);
            }

        private void validateCateringPrices(Receipt receipt) {
                for (ReceiptItem item : receipt.getItems()) {
                        Product product = item.getProduct();

                        // Verificăm dacă tipul este CATERING
                        if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {

                                // Verificăm doar prețul de achiziție din fișa produsului
                                if (product.getPurchasePrice() == null) {
                                        throw new RuntimeException("ERROR.CATERING.PURCHASE_PRICE_NULL");
                                }
                        }
                }
        }
}
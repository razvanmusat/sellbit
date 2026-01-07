package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.sellbit.domain.cash.cashmovement.CashMovementService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.stockcurrent.StockCurrentService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.inventory.warehouse.WarehouseRepository;
import com.sellbit.domain.lookup.cancelreason.CancelReason;
import com.sellbit.domain.lookup.cancelreason.CancelReasonRepository;
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
        
    /**
     * OPERAȚIONAL: Pentru afișarea meselor/bonurilor deschise în tab-ul din React.
     */
    @Transactional(readOnly = true)
    public List<ReceiptDTOs.Response> getActiveReceipts(Integer warehouseId) {
        return receiptRepository.findByWarehouseIdAndStatus_Code(warehouseId, "OPEN")
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * RAPORTARE: Istoric bonuri pe gestiune, status și perioadă.
     */
    @Transactional(readOnly = true)
    public List<ReceiptDTOs.Response> getReceiptsReport(Integer warehouseId, String statusCode, LocalDateTime start, LocalDateTime end) {
        return receiptRepository.findByWarehouseIdAndStatus_CodeAndClosedAtBetween(warehouseId, statusCode, start, end)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Deschide un bon nou (status OPEN).
     */
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

    /**
     * Returnează bonurile deschise din zilele anterioare (Alerte UX).
     */
    @Transactional(readOnly = true)
    public List<ReceiptDTOs.UnclosedAlert> getUnclosedAlerts() {
        LocalDateTime startOfToday = LocalDateTime.of(LocalDate.now(), LocalTime.MIN);
        
        return receiptRepository.findByStatus_Code("OPEN").stream()
                .filter(r -> r.getCreatedAt().isBefore(startOfToday))
                .map(r -> new ReceiptDTOs.UnclosedAlert(
                        r.getId(),
                        r.getTableName(),
                        r.getCreatedAt(),
                        r.getWarehouse().getName()
                ))
                .collect(Collectors.toList());
    }

    /**
     * Anulează un bon deschis și returnează stocul live.
     */
    @Transactional
    public void cancelOpenReceipt(Integer receiptId, Integer reasonId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
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
                BigDecimal.ZERO
            );
        }
        voucherService.cancelVoucherUsage(receiptId);

        receipt.setStatus(cancelledStatus);
        receipt.setCancelReason(reason);
        receipt.setClosedAt(LocalDateTime.now());
        receiptRepository.save(receipt);
    }

    /**
     * Închide bonul. Verifică dacă plățile (fracționate) acoperă totalul.
     */
    /**
     * Închide bonul. 
     * Această metodă finalizează vânzarea, verifică plățile și descarcă gestiunea (FIFO).
     */
    @Transactional
    public void closeReceipt(Integer receiptId) {
        // 1. Căutăm bonul
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        // 2. Validăm statusul (doar bonurile OPEN pot fi închise)
        if (!"OPEN".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_OPEN");
        }
        
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
                        item.getProduct().getId()
                );

                // 2. Îl salvezi pe linie (Aici se "bate în cuie" profitul)
                item.setPurchaseUnitPrice(purchasePrice);
                itemRepository.save(item);
                // 3. Descarci gestiunea (FIFO)
                purchaseService.deductFromBatchesFIFO(
                        receipt.getWarehouse().getId(),
                        item.getProduct().getId(),
                        item.getQuantity()
                );
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

    /**
     * Recalculează header-ul bonului (apelată din ReceiptItemService).
     */
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

    /**
     * Mapper pentru Response DTO.
     */
    public ReceiptDTOs.Response mapToResponse(Receipt receipt) {
        return new ReceiptDTOs.Response(
                receipt.getId(),
                receipt.getStatus().getLabel(),
                receipt.getTableName(),
                receipt.getTotalAmount(),
                receipt.getTotalNet(),
                receipt.getTotalVat(),
                receipt.getWarehouse().getName(),
                receipt.getUser() != null ? receipt.getUser().getFullName() : "N/A",
                receipt.getCreatedAt(),
                receipt.getClosedAt(),
                receipt.getNote(),
                receipt.getOriginalReceipt() != null ? receipt.getOriginalReceipt().getId() : null
        );
    }

    /**
     * Creează un bon de stornare (parțială sau totală).
     */
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
                .tableName("REFUND: " + original.getId())
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
            // Înmulțim prețul unitar (care include deja rotunjirile legale de la vânzare) cu cantitatea de retur
            BigDecimal lineTotal = originalItem.getUnitPrice()
                    .multiply(itemReq.quantityToRefund())
                    .setScale(2, java.math.RoundingMode.HALF_UP)
                    .negate();

            // Calculăm Net și TVA proporțional cu noul Total ca să păstrăm cota de TVA intactă
            BigDecimal vatFactor = originalItem.getVatRate().divide(new BigDecimal("100")).add(BigDecimal.ONE);
            BigDecimal netTotal = lineTotal.divide(vatFactor, 2, java.math.RoundingMode.HALF_UP);
            BigDecimal vatTotal = lineTotal.subtract(netTotal);

            ReceiptItem refundItem = ReceiptItem.builder()
                    .product(originalItem.getProduct())
                    .quantity(itemReq.quantityToRefund().negate())
                    .unitPrice(originalItem.getUnitPrice())
                    .purchaseUnitPrice(originalItem.getPurchaseUnitPrice()) // Păstrăm prețul de achiziție original pentru profit corect
                    .vatRate(originalItem.getVatRate())
                    .lineTotal(lineTotal)
                    .netTotal(netTotal)
                    .vatTotal(vatTotal)
                    .build();

            refundReceipt.addItem(refundItem);

            // Sincronizăm stocul (refundItem.quantity este deja negativ, deci syncStock va face "minus cu minus = plus")
            stockCurrentService.syncStockFromReceiptChange(
                    refundReceipt.getWarehouse().getId(),
                    originalItem.getProduct().getId(),
                    BigDecimal.ZERO,
                    refundItem.getQuantity()
            );

            tAmount = tAmount.add(lineTotal);
            tNet = tNet.add(netTotal);
            tVat = tVat.add(vatTotal);
        }

        refundReceipt.setTotalAmount(tAmount);
        refundReceipt.setTotalNet(tNet);
        refundReceipt.setTotalVat(tVat);

        // 4. Logica de bani (Cash Movement)
        boolean wasCash = original.getPayments().stream()
                .anyMatch(p -> "CASH".equals(p.getPaymentMethod().getCode()));

        boolean wasCard = original.getPayments().stream()
                .anyMatch(p -> "CARD".equals(p.getPaymentMethod().getCode()));
        
        if (wasCash) {
            // Trimitem valoarea absolută, CashMovementService se ocupă de semnul de REFUND
            cashMovementService.createMovement(
                original.getWarehouse().getId(),
                "REFUND",
                tAmount.abs(),
                request.userId(),
                "Stornare bon nr. " + original.getId()
            );
        }
        
        if (wasCard) {
            // AICI: Depinde de cum ai CashMovementService. 
            // Dacă ai un singur tabel de mișcări, trebuie să marchezi că e ieșire de pe CARD.
            cashMovementService.createMovement(
                original.getWarehouse().getId(),
                "REFUND_CARD",
                tAmount.abs(),
                request.userId(),
                "Stornare Card bon nr. " + original.getId()
            );
        }

        return mapToResponse(receiptRepository.save(refundReceipt));
    }
    
    @Transactional(readOnly = true)
    public BigDecimal getGrossProfitReport(LocalDateTime start, LocalDateTime end) {
        // 1. Profitul brut teoretic (din linii)
        BigDecimal grossTheoreticalProfit = itemRepository.calculateTotalProfit(start, end);
        
        // 2. Suma discount-urilor oferite prin vouchere (plăți virtuale)
        // Presupunem că ai injectat paymentRepository în ReceiptService
        BigDecimal totalVouchers = paymentRepository.getTotalVoucherDiscounts(start, end);
        
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
                        item.getUnitPrice()
                )).toList();

        // RETURN cu mapare pe index (respectând ordinea ta din record)
        return new ReceiptPrintDTO(
                store.getName(),           // 1
                store.getAddress(),        // 2
                store.getPhone(),          // 3
                items,                     // 4
                usedVoucherCode,           // 5 (voucherCode)
                campaignName,              // 6 (voucherCampaignName)
                receipt.getTotalAmount(),  // 7 (subtotal)
                totalVoucher.compareTo(BigDecimal.ZERO) > 0 ? totalVoucher : null, // 8 (voucherValue)
                paidOutOfPocket,           // 9 (totalToPay)
                receipt.getCreatedAt()     // 10
        );
    }
    
    @Transactional
    public void removeVoucherPayment(Integer receiptId, Integer paymentId) {
        // 1. Verificăm dacă plata există și aparține acestui bon
        ReceiptPayment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("ERROR.PAYMENT.NOT_FOUND"));
                
        if (!payment.getReceipt().getId().equals(receiptId)) {
            throw new RuntimeException("ERROR.PAYMENT.MISMATCH");
        }

        // 2. Ștergem pata din bon
        paymentRepository.delete(payment);
        
        // 3. Reactivam voucherul
        voucherService.cancelVoucherUsage(receiptId);              
    }
}
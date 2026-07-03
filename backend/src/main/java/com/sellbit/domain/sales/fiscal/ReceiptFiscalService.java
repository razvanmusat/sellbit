package com.sellbit.domain.sales.fiscal;

import com.sellbit.domain.catalog.product.ProductService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatusRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReceiptFiscalService {

    private final ReceiptRepository receiptRepository;
    private final ReceiptStatusRepository statusRepository;
    private final ReceiptItemRepository itemRepository;
    private final FiscalAgentService fiscalAgentService;
    private final PurchaseService purchaseService;
    private final ProductService productService;
    private final ReceiptService receiptService;

    // Self-injection pentru a trece prin proxy Spring și a respecta @Transactional
    @Setter(onMethod_ = {@Autowired, @Lazy})
    private ReceiptFiscalService self;

    // Orchestrator: fără @Transactional intenționat — Fisco nu trebuie să fie în interiorul unei tranzacții DB
    public CustomerVoucherDTOs.VoucherIssuanceResult closeFiscal(Integer receiptId) {
        self.markFiscalPending(receiptId); // TX1 → commit

        Receipt receipt = self.loadReceiptForFiscal(receiptId);

        try {
            fiscalAgentService.printGvBon(receipt);
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.startsWith("ERROR.FISCAL.PRINT_REJECTED")) {
                // POST a ajuns la Fisco, dar a fost respins înainte de a crea un job → rollback sigur la OPEN
                self.rollbackToOpen(receiptId);
            } else if (msg.equals("ERROR.FISCAL.CONNECT_FAILED")) {
                // TCP refused — tunel căzut, Fisco sigur nu a primit nimic → rollback sigur la OPEN
                self.rollbackToOpen(receiptId);
            } else if (msg.equals("ERROR.FISCAL.AGENT_UNREACHABLE")) {
                // Conexiune căzută în tranzit — incert dacă Fisco a primit request-ul.
                String existingStatus = fiscalAgentService.findStatusByExternalId("sb-" + receiptId);
                if ("not_found".equals(existingStatus)) {
                    // Fisco e reachabil și confirmă că nu are jobul → rollback sigur la OPEN
                    self.rollbackToOpen(receiptId);
                }
                // null = Fisco inaccesibil → FISCAL_PENDING → reconciliere
                // orice alt status = Fisco are jobul → FISCAL_PENDING → reconciliere
            }
            // POLLING_LOST, TIMEOUT, PRINT_FAILED → rămâne FISCAL_PENDING, reconcilierea rezolvă
            throw e;
        }

        return self.completeFiscalClose(receiptId); // TX2 → commit
    }

    // Orchestrator avans petrecere: TX1 creare bon FISCAL_PENDING → print → TX2 finalizare.
    // Bon fiscal doar dacă gestiunea aleasă e GV (filtrarea din printGvBon); altfel se închide direct.
    public void registerAdvanceFiscal(Integer warehouseId, BigDecimal amount,
            String paymentMethodCode, Integer userId, String note) {
        Integer receiptId = receiptService.createDirectReceiptPending(
                "ADVANCE", warehouseId, amount, paymentMethodCode, userId, note);
        printDirectOrCleanup(receiptId);
        self.completeFiscalClose(receiptId);
    }

    // Orchestrator card cadou: identic cu avansul, dar TX2 emite și voucherul cadou
    public CustomerVoucherDTOs.IssuedVoucherInfo registerGiftCardFiscal(Integer warehouseId,
            BigDecimal amount, String paymentMethodCode, Integer userId, String note) {
        Integer receiptId = receiptService.createDirectReceiptPending(
                "GIFT_CARD", warehouseId, amount, paymentMethodCode, userId, note);
        printDirectOrCleanup(receiptId);
        CustomerVoucherDTOs.VoucherIssuanceResult result = self.completeFiscalClose(receiptId);
        return result.vouchers().isEmpty() ? null : result.vouchers().get(0);
    }

    // Print pentru bon direct — aceleași cazuri ca în closeFiscal, dar la eșec sigur bonul
    // abia creat se ȘTERGE (nu are încă mișcare de casă / voucher), nu revine la OPEN
    private void printDirectOrCleanup(Integer receiptId) {
        Receipt receipt = self.loadReceiptForFiscal(receiptId);
        try {
            fiscalAgentService.printGvBon(receipt);
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "";
            if (msg.startsWith("ERROR.FISCAL.PRINT_REJECTED") || msg.equals("ERROR.FISCAL.CONNECT_FAILED")) {
                // Fisco sigur nu a creat un job → ștergere sigură
                self.deletePendingReceipt(receiptId);
            } else if (msg.equals("ERROR.FISCAL.AGENT_UNREACHABLE")) {
                String existingStatus = fiscalAgentService.findStatusByExternalId("sb-" + receiptId);
                if ("not_found".equals(existingStatus)) {
                    // Fisco e reachabil și confirmă că nu are jobul → ștergere sigură
                    self.deletePendingReceipt(receiptId);
                }
                // null / alt status → rămâne FISCAL_PENDING → reconciliere
            }
            // POLLING_LOST, TIMEOUT, PRINT_FAILED → rămâne FISCAL_PENDING, reconcilierea rezolvă
            throw e;
        }
    }

    @Transactional
    public void deletePendingReceipt(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null || !"FISCAL_PENDING".equals(receipt.getStatus().getCode())) {
            return;
        }
        receiptRepository.delete(receipt); // items + payments cad prin cascade
    }

    // Încarcă receipt cu items + payments în aceeași tranzacție (L1 cache activ)
    @Transactional(readOnly = true)
    public Receipt loadReceiptForFiscal(Integer receiptId) {
        receiptRepository.findByIdWithItems(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        return receiptRepository.findByIdWithPayments(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
    }

    @Transactional
    public void rollbackToOpen(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        ReceiptStatus openStatus = statusRepository.findByCode("OPEN")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));
        receipt.setStatus(openStatus);
        receiptRepository.save(receipt);
    }

    // TX1: validări + setare FISCAL_PENDING
    @Transactional
    public void markFiscalPending(Integer receiptId) {
        receiptRepository.findByIdWithItems(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        Receipt receipt = receiptRepository.findByIdWithPayments(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        String statusCode = receipt.getStatus().getCode();
        if ("FISCAL_PENDING".equals(statusCode)) {
            throw new RuntimeException("ERROR.RECEIPT.ALREADY_FISCAL_PENDING");
        }
        if (!"OPEN".equals(statusCode) && !"FISCAL_FAILED".equals(statusCode)) {
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
                Warehouse itemWarehouse = productService.resolveWarehouse(item.getProduct(), item.getWarehouse());
                purchaseService.validateStockAvailability(itemWarehouse.getId(), item.getProduct(), item.getQuantity());
            }
        }

        ReceiptStatus fiscalPendingStatus = statusRepository.findByCode("FISCAL_PENDING")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

        receipt.setStatus(fiscalPendingStatus);
        receiptRepository.save(receipt);
    }

    // TX2: FIFO + setare CLOSED + vouchers (apelat și de reconciliere)
    @Transactional
    public CustomerVoucherDTOs.VoucherIssuanceResult completeFiscalClose(Integer receiptId) {
        receiptRepository.findByIdWithItems(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        Receipt receipt = receiptRepository.findByIdWithPayments(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"FISCAL_PENDING".equals(receipt.getStatus().getCode())) {
            throw new RuntimeException("ERROR.RECEIPT.NOT_FISCAL_PENDING");
        }

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

        // Kind-aware: vouchere campanii pentru vânzări, mișcare de casă + voucher cadou pentru bonuri directe
        return receiptService.finalizeClosedReceipt(receipt);
    }

    @Transactional
    public void markFiscalFailed(Integer receiptId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));

        if (!"FISCAL_PENDING".equals(receipt.getStatus().getCode())) return;

        ReceiptStatus failedStatus = statusRepository.findByCode("FISCAL_FAILED")
                .orElseThrow(() -> new RuntimeException("ERROR.STATUS.NOT_FOUND"));

        receipt.setStatus(failedStatus);
        receiptRepository.save(receipt);
    }

    private void validateCateringPrices(Receipt receipt) {
        for (ReceiptItem item : receipt.getItems()) {
            var product = item.getProduct();
            if (product.getProductType() != null && "CATERING".equals(product.getProductType().getCode())) {
                if (product.getPurchasePrice() == null) {
                    throw new RuntimeException("ERROR.CATERING.PURCHASE_PRICE_NULL");
                }
            }
        }
    }

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
}

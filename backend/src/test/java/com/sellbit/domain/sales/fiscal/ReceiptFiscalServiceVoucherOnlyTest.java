package com.sellbit.domain.sales.fiscal;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductService;
import com.sellbit.domain.inventory.purchase.PurchaseService;
import com.sellbit.domain.inventory.warehouse.Warehouse;
import com.sellbit.domain.lookup.paymentmethod.PaymentMethod;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatus;
import com.sellbit.domain.lookup.receiptstatus.ReceiptStatusRepository;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receipt.ReceiptService;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPayment;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherDTOs;
import com.sellbit.domain.voucher.customervoucher.CustomerVoucherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Smoke test: "1 oră loc de joacă" pe GV, plătit integral din voucher — exact scenariul
// reprodus la locul de joacă (eroare reală: ERROR.FISCAL.NOT_CONNECTED). Bonul ăsta n-are
// nevoie deloc de Fisco (needsFiscalPrint=false), deci nu trebuie să verifice conexiunea.
@ExtendWith(MockitoExtension.class)
class ReceiptFiscalServiceVoucherOnlyTest {

    @Mock private ReceiptRepository receiptRepository;
    @Mock private ReceiptStatusRepository statusRepository;
    @Mock private ReceiptItemRepository itemRepository;
    @Mock private PurchaseService purchaseService;
    @Mock private ProductService productService;
    @Mock private ReceiptService receiptService;
    @Mock private CustomerVoucherRepository voucherRepository;

    private FiscalAgentService fiscalAgentService;

    private ReceiptFiscalService receiptFiscalService;

    private ReceiptStatus fiscalPendingStatus;
    private ReceiptStatus closedStatus;
    private Warehouse gv;

    @BeforeEach
    void setUp() {
        fiscalAgentService = spy(new FiscalAgentService(voucherRepository));
        receiptFiscalService = new ReceiptFiscalService(
                receiptRepository, statusRepository, itemRepository,
                fiscalAgentService, purchaseService, productService, receiptService);
        receiptFiscalService.setSelf(receiptFiscalService);

        fiscalPendingStatus = new ReceiptStatus();
        fiscalPendingStatus.setCode("FISCAL_PENDING");
        closedStatus = new ReceiptStatus();
        closedStatus.setCode("CLOSED");

        gv = new Warehouse();
        gv.setId(1);
        gv.setCode("GV");
    }

    @Test
    void oraDeJoacaPlatitaIntegralDinVoucher_NuVerificaDelocConexiuneaLaFisco() {
        Product product = new Product();
        product.setId(10);
        product.setName("1 oră loc de joacă");

        ReceiptItem item = ReceiptItem.builder()
                .product(product)
                .warehouse(gv)
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("50.00"))
                .lineTotal(new BigDecimal("50.00"))
                .build();

        PaymentMethod voucherMethod = new PaymentMethod();
        voucherMethod.setCode("VOUCHER");
        ReceiptPayment voucherPayment = ReceiptPayment.builder()
                .paymentMethod(voucherMethod)
                .amount(new BigDecimal("50.00"))
                .warehouse(gv)
                .build();

        Receipt receipt = Receipt.builder()
                .id(1)
                .status(fiscalPendingStatus)
                .totalAmount(new BigDecimal("50.00"))
                .items(List.of(item))
                .payments(List.of(voucherPayment))
                .build();

        when(receiptRepository.findByIdWithItems(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.findByIdWithPayments(1)).thenReturn(Optional.of(receipt));
        when(receiptRepository.lockById(1)).thenReturn(Optional.of(receipt));
        when(statusRepository.findByCode("CLOSED")).thenReturn(Optional.of(closedStatus));
        when(productService.resolveWarehouse(product, gv)).thenReturn(gv);
        when(receiptService.finalizeClosedReceipt(receipt))
                .thenReturn(new CustomerVoucherDTOs.VoucherIssuanceResult(List.of(), null));

        var result = receiptFiscalService.attemptPrintAndFinalize(1);

        assertNotNull(result);
        assertEquals("CLOSED", receipt.getStatus().getCode(), "Bonul trebuia închis, nu blocat");
        verify(fiscalAgentService, never()).checkHealth();
        verify(fiscalAgentService, never()).printGvBon(any(), any());
    }
}

package com.sellbit.domain.voucher.customervoucher;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaign;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaignRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class CustomerVoucherServiceTest {

    @Mock private CustomerVoucherRepository voucherRepository;
    @Mock private VoucherCampaignRepository campaignRepository;
    @Mock private ReceiptRepository receiptRepository;
    @InjectMocks private CustomerVoucherService voucherService;

    // Helper pentru a crea un voucher valid cu campanie atașată (evită NPE)
    private CustomerVoucher createBaseVoucher(String code) {
        VoucherCampaign campaign = VoucherCampaign.builder()
                .name("Campanie Test")
                .applicableDays("1234567")
                .prefix("V")
                .codeLength(5)
                .validDays(7)
                .maxDiscountAmount(new BigDecimal("100.00")) // Setare implicit pentru teste
                .build();
        return CustomerVoucher.builder()
                .code(code)
                .campaign(campaign)
                .discountType("FIXED")
                .discountValue(new BigDecimal("10.00"))
                .expiresAt(LocalDateTime.now().plusDays(5))
                .used(false)
                .build();
    }

    // --- 1. getAllVouchers ---
    @Test void getAllVouchers_Valid() {
        when(voucherRepository.findAll()).thenReturn(List.of(createBaseVoucher("V1")));
        assertThat(voucherService.getAllVouchers()).hasSize(1);
    }
    @Test void getAllVouchers_Empty() {
        when(voucherRepository.findAll()).thenReturn(List.of());
        assertThat(voucherService.getAllVouchers()).isEmpty();
    }

    // --- 2. getUsedVouchers ---
    @Test void getUsedVouchers_Valid() {
        when(voucherRepository.findAllByUsedTrueOrderByUsedAtDesc()).thenReturn(List.of(createBaseVoucher("V1")));
        assertThat(voucherService.getUsedVouchers()).hasSize(1);
    }
    @Test void getUsedVouchers_Empty() {
        when(voucherRepository.findAllByUsedTrueOrderByUsedAtDesc()).thenReturn(List.of());
        assertThat(voucherService.getUsedVouchers()).isEmpty();
    }

    // --- 3. getAvailableVouchers ---
    @Test void getAvailableVouchers_Valid() {
        when(voucherRepository.findAvailable(any())).thenReturn(List.of(createBaseVoucher("V1")));
        assertThat(voucherService.getAvailableVouchers()).hasSize(1);
    }
    @Test void getAvailableVouchers_Empty() {
        when(voucherRepository.findAvailable(any())).thenReturn(List.of());
        assertThat(voucherService.getAvailableVouchers()).isEmpty();
    }

    // --- 4. validateCode ---
    @Test void validateCode_Success() {
        CustomerVoucher v = createBaseVoucher("VALID");
        when(voucherRepository.findByCode("VALID")).thenReturn(Optional.of(v));
        var res = voucherService.validateCode("VALID");
        assertThat(res.isValid()).isTrue();
    }
    @Test void validateCode_AlreadyUsed_Fails() {
        CustomerVoucher v = createBaseVoucher("USED");
        v.setUsed(true);
        when(voucherRepository.findByCode("USED")).thenReturn(Optional.of(v));
        var res = voucherService.validateCode("USED");
        assertThat(res.isValid()).isFalse();
        assertThat(res.errorCode()).isEqualTo("ERROR.CUSTOMER_VOUCHER.ALREADY_USED");
    }
    @Test void validateCode_Expired_Fails() {
        CustomerVoucher v = createBaseVoucher("OLD");
        v.setExpiresAt(LocalDateTime.now().minusDays(1));
        when(voucherRepository.findByCode("OLD")).thenReturn(Optional.of(v));
        var res = voucherService.validateCode("OLD");
        assertThat(res.isValid()).isFalse();
        assertThat(res.errorCode()).isEqualTo("ERROR.CUSTOMER_VOUCHER.EXPIRED");
    }

    // --- 5. consumeVoucher ---
    @Test void consumeVoucher_Success() {
        CustomerVoucher v = createBaseVoucher("C1");
        when(voucherRepository.findByCode("C1")).thenReturn(Optional.of(v));
        voucherService.consumeVoucher("C1", new Receipt());
        assertThat(v.getUsed()).isTrue();
        verify(voucherRepository).save(v);
    }
    @Test void consumeVoucher_Fail_Used() {
        CustomerVoucher v = createBaseVoucher("C1");
        v.setUsed(true);
        when(voucherRepository.findByCode("C1")).thenReturn(Optional.of(v));
        assertThatThrownBy(() -> voucherService.consumeVoucher("C1", new Receipt()))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.CUSTOMER_VOUCHER.ALREADY_USED");
    }

    @Test
    void consumeVoucher_WithReceiptId_SetsUsedAtFromReceiptClosedAt() {
        CustomerVoucher v = createBaseVoucher("C1");
        Receipt receipt = new Receipt();
        LocalDateTime closedAt = LocalDateTime.now().minusMinutes(5);
        receipt.setClosedAt(closedAt);

        when(receiptRepository.findById(123)).thenReturn(Optional.of(receipt));
        when(voucherRepository.findByCode("C1")).thenReturn(Optional.of(v));

        voucherService.consumeVoucher("C1", 123);

        assertThat(v.getUsed()).isTrue();
        assertThat(v.getUsedReceipt()).isSameAs(receipt);
        assertThat(v.getUsedAt()).isEqualTo(closedAt);
        verify(voucherRepository).save(v);
    }

    @Test
    void consumeVoucher_WithReceiptId_NotFound_ThrowsException() {
        when(receiptRepository.findById(999)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> voucherService.consumeVoucher("C1", 999))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.RECEIPT.NOT_FOUND");
    }

    // --- 6. calculateVoucherValue (FIXED, PERCENT, FREE_HOURS) ---
    @Test void calculateValue_Fixed_Capped() {
        CustomerVoucher v = createBaseVoucher("FIXED");
        v.setDiscountValue(new BigDecimal("50.00"));
        Receipt r = Receipt.builder().totalAmount(new BigDecimal("30.00")).build();
        assertThat(voucherService.calculateVoucherValue(v, r)).isEqualByComparingTo("30.00");
    }
    @Test void calculateValue_Percent_Valid() {
        CustomerVoucher v = createBaseVoucher("PERC");
        v.setDiscountType("PERCENT");
        v.setDiscountValue(new BigDecimal("10.00"));
        Receipt r = Receipt.builder().totalAmount(new BigDecimal("200.00")).build();
        assertThat(voucherService.calculateVoucherValue(v, r)).isEqualByComparingTo("20.00");
    }
    @Test void calculateValue_FreeHours_Valid() {
        VoucherCampaign c = VoucherCampaign.builder().applicableProductId(10).build();
        CustomerVoucher v = createBaseVoucher("HOURS");
        v.setCampaign(c);
        v.setDiscountType("FREE_HOURS");
        v.setDiscountValue(new BigDecimal("2.00"));
        
        ReceiptItem item = ReceiptItem.builder()
                .product(Product.builder().id(10).build())
                .unitPrice(new BigDecimal("25.00")).build();
        Receipt r = Receipt.builder().items(List.of(item)).totalAmount(new BigDecimal("100.00")).build();
        
        assertThat(voucherService.calculateVoucherValue(v, r)).isEqualByComparingTo("50.00");
    }

    // --- 7. checkAndIssueVouchers (isEligible) ---
    @Test void issueVouchers_Eligible_Saves() {
        VoucherCampaign cp = VoucherCampaign.builder().id(1).minAmount(new BigDecimal("50")).validDays(5).codeLength(5).build();
        when(campaignRepository.findAllActive(any())).thenReturn(List.of(cp));
        when(voucherRepository.existsByCode(any())).thenReturn(false);
        
        voucherService.checkAndIssueVouchers(Receipt.builder().totalAmount(new BigDecimal("100")).build());
        verify(voucherRepository).save(any(CustomerVoucher.class));
    }
    @Test void issueVouchers_NotEligible_ProductMissing() {
        VoucherCampaign cp = VoucherCampaign.builder().requiredProductIds(List.of(99)).build();
        when(campaignRepository.findAllActive(any())).thenReturn(List.of(cp));
        
        Receipt r = Receipt.builder().items(List.of()).totalAmount(new BigDecimal("100")).build();
        voucherService.checkAndIssueVouchers(r);
        verify(voucherRepository, never()).save(any());
    }

    // --- 8. cancelVoucherUsage ---
    @Test void cancelVoucherUsage_Success() {
        CustomerVoucher v = createBaseVoucher("C1");
        v.setUsed(true);
        v.setUsedAt(LocalDateTime.now());
        when(voucherRepository.findByUsedReceiptId(100)).thenReturn(Optional.of(v));
        voucherService.cancelVoucherUsage(100);
        assertThat(v.getUsed()).isFalse();
        assertThat(v.getUsedAt()).isNull();
        verify(voucherRepository).save(v);
    }
    @Test void cancelVoucherUsage_NoVoucher_DoesNothing() {
        when(voucherRepository.findByUsedReceiptId(100)).thenReturn(Optional.empty());
        voucherService.cancelVoucherUsage(100);
        verify(voucherRepository, never()).save(any());
    }
    
    @Test
    void shouldReactivateVoucherSuccessfully() {
        // GIVEN
        String code = "TEST-123";
        CustomerVoucher voucher = new CustomerVoucher();
        voucher.setCode(code);
        voucher.setUsed(true);
        voucher.setUsedReceipt(new Receipt());

        when(voucherRepository.findByCode(code)).thenReturn(Optional.of(voucher));

        // WHEN
        voucherService.reactivateVoucherByCode(code);

        // THEN
        assertFalse(voucher.getUsed());
        assertNull(voucher.getUsedReceipt());
        assertNull(voucher.getUsedAt());
        verify(voucherRepository).save(voucher);
    }

    @Test
    void shouldThrowExceptionWhenReactivatingAlreadyActiveVoucher() {
        // GIVEN
        String code = "ACTIVE-123";
        CustomerVoucher voucher = new CustomerVoucher();
        voucher.setUsed(false);

        when(voucherRepository.findByCode(code)).thenReturn(Optional.of(voucher));

        // WHEN & THEN
        assertThatThrownBy(() -> voucherService.reactivateVoucherByCode(code))
            .isInstanceOf(RuntimeException.class)
            .hasMessage("ERROR.VOUCHER.ALREADY_ACTIVE");
    }
}
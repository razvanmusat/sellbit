package com.sellbit.domain.voucher.vouchercampaign;

import com.sellbit.domain.catalog.product.ProductRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VoucherCampaignServiceTest {

    @Mock private VoucherCampaignRepository repository;
    @Mock private ProductRepository productRepository;
    @Mock private CampaignTypeRepository campaignTypeRepository;

    @InjectMocks private VoucherCampaignService service;

    // --- HELPERS ---

    private CampaignType regularType() {
        return CampaignType.builder().id(1).code("REGULAR").label("Regular").build();
    }

    private CampaignType giftCardType() {
        return CampaignType.builder().id(2).code("GIFT_CARD").label("Card Cadou").build();
    }

    private CampaignType loyaltyType() {
        return CampaignType.builder().id(3).code("LOYALTY").label("Fidelitate").build();
    }

    /** Request valid cu REGULAR, PERCENT 10%, minAmount 50 lei, requiredProductId=1 */
    private VoucherCampaignDTOs.Request createValidRequest() {
        return new VoucherCampaignDTOs.Request(
                "Campanie Vara", LocalDate.now(), LocalDate.now().plusMonths(1),
                "PERCENT", new BigDecimal("10.00"), new BigDecimal("50.00"),
                new BigDecimal("50.00"),
                1,
                List.of(1),
                null,
                30, "12345", "V-", 4, "Template",
                "REGULAR", 1, null
        );
    }

    // --- 1. create — SUCCES ---

    @Test
    @DisplayName("create: Succes cu date valide (REGULAR)")
    void create_Success() {
        VoucherCampaignDTOs.Request req = createValidRequest();

        when(productRepository.existsById(1)).thenReturn(true);
        when(campaignTypeRepository.findByCode("REGULAR")).thenReturn(Optional.of(regularType()));
        when(repository.existsByPrefixAndActiveTrue("V-")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.name()).isEqualTo("Campanie Vara");
        assertThat(response.campaignType()).isEqualTo("REGULAR");
        verify(repository).save(any());
    }

    @Test
    @DisplayName("create: FIXED discount fără maxDiscountAmount (permis)")
    void create_FixedDiscount_WithoutMaxDiscountAmount_Success() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Campanie FIXED", LocalDate.now(), LocalDate.now().plusMonths(1),
                "FIXED", new BigDecimal("50.00"), null,
                new BigDecimal("50.00"), 1, List.of(1), null, 30, "12345", "F-", 4, "Template",
                "REGULAR", 1, null
        );

        when(productRepository.existsById(1)).thenReturn(true);
        when(campaignTypeRepository.findByCode("REGULAR")).thenReturn(Optional.of(regularType()));
        when(repository.existsByPrefixAndActiveTrue("F-")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);
        assertThat(response.name()).isEqualTo("Campanie FIXED");
        verify(repository).save(any());
    }

    // --- 2. create — VALIDĂRI ---

    @Test
    @DisplayName("create: Eroare la interval de date invalid (end < start)")
    void create_InvalidDates_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now().plusDays(10), LocalDate.now(),
                "FIXED", BigDecimal.TEN, BigDecimal.valueOf(5),
                BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, "",
                "REGULAR", 1, null
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE");
    }

    @Test
    @DisplayName("create: Eroare produs necesar inexistent")
    void create_RequiredProductNotFound_ThrowsException() {
        VoucherCampaignDTOs.Request req = createValidRequest();
        when(productRepository.existsById(req.requiredProductIds().get(0))).thenReturn(false);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.REQUIRED_PRODUCT_NOT_FOUND");
    }

    @Test
    @DisplayName("create: Eroare produs aplicabil inexistent")
    void create_ApplicableProductNotFound_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now(), LocalDate.now().plusDays(1),
                "FIXED", BigDecimal.TEN, BigDecimal.valueOf(5),
                BigDecimal.ZERO, 0,
                null, 99,
                30, "1", "P", 4, "",
                "REGULAR", 1, null
        );

        when(productRepository.existsById(99)).thenReturn(false);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.APPLICABLE_PRODUCT_NOT_FOUND");
    }

    @Test
    @DisplayName("create: Eroare discount negativ")
    void create_NegativeDiscount_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now(), LocalDate.now().plusDays(1),
                "FIXED", new BigDecimal("-5.00"), BigDecimal.valueOf(5),
                BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, "",
                "REGULAR", 1, null
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.NEGATIVE_DISCOUNT");
    }

    @Test
    @DisplayName("create: Eroare procent > 100%")
    void create_PercentOver100_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now(), LocalDate.now().plusDays(1),
                "PERCENT", new BigDecimal("105.00"), BigDecimal.valueOf(5),
                BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, "",
                "REGULAR", 1, null
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.PERCENT_OVER_100");
    }

    @Test
    @DisplayName("create: Eroare PERCENT discount fără maxDiscountAmount")
    void create_PercentDiscount_WithoutMaxDiscountAmount_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Campanie PERCENT", LocalDate.now(), LocalDate.now().plusMonths(1),
                "PERCENT", new BigDecimal("10.00"), null,
                new BigDecimal("50.00"), 1, List.of(1), null, 30, "12345", "P-", 4, "Template",
                "REGULAR", 1, null
        );

        when(productRepository.existsById(1)).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_REQUIRED");
    }

    @Test
    @DisplayName("create: Eroare prefix deja activ")
    void create_DuplicatePrefix_ThrowsException() {
        VoucherCampaignDTOs.Request req = createValidRequest();

        when(productRepository.existsById(1)).thenReturn(true);
        when(campaignTypeRepository.findByCode("REGULAR")).thenReturn(Optional.of(regularType()));
        when(repository.existsByPrefixAndActiveTrue("V-")).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.PREFIX_ALREADY_ACTIVE");
    }

    @Test
    @DisplayName("create: Tip campanie invalid aruncă eroare")
    void create_InvalidCampaignType_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Test", LocalDate.now(), LocalDate.now().plusMonths(1),
                "FIXED", new BigDecimal("10.00"), null,
                new BigDecimal("50.00"), null, null, null,
                30, null, "TST", 4, null,
                "UNKNOWN_TYPE", 1, null
        );

        when(campaignTypeRepository.findByCode("UNKNOWN_TYPE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.INVALID_TYPE");
    }

    // --- 3. create — TIPURI NOI ---

    @Test
    @DisplayName("create: GIFT_CARD — sare peste validarea discountului, acceptă null pe discount/minAmount")
    void create_GiftCardType_SkipsDiscountValidation_Success() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Card Cadou", LocalDate.now(), LocalDate.now().plusYears(1),
                null, null, null,
                null, null, null, null,
                365, null, "GC", 6, null,
                "GIFT_CARD", 1, null
        );

        when(campaignTypeRepository.findByCode("GIFT_CARD")).thenReturn(Optional.of(giftCardType()));
        when(repository.existsByPrefixAndActiveTrue("GC")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.name()).isEqualTo("Card Cadou");
        assertThat(response.campaignType()).isEqualTo("GIFT_CARD");
        verify(repository).save(any());
    }

    @Test
    @DisplayName("create: LOYALTY — stampsRequired salvat corect")
    void create_LoyaltyType_WithStampsRequired_Success() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Fidelitate 5 Vizite", LocalDate.now(), LocalDate.now().plusYears(1),
                "FIXED", new BigDecimal("50.00"), null,
                new BigDecimal("200.00"), null, null, null,
                180, null, "LYL", 6, null,
                "LOYALTY", 1, 5
        );

        when(campaignTypeRepository.findByCode("LOYALTY")).thenReturn(Optional.of(loyaltyType()));
        when(repository.existsByPrefixAndActiveTrue("LYL")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.campaignType()).isEqualTo("LOYALTY");
        assertThat(response.stampsRequired()).isEqualTo(5);
        verify(repository).save(any());
    }

    @Test
    @DisplayName("create: REGULAR — vouchersPerReceipt=3 salvat corect")
    void create_RegularType_MultipleVouchersPerReceipt_Success() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Petrecere Premium", LocalDate.now(), LocalDate.now().plusMonths(6),
                "FIXED", new BigDecimal("20.00"), null,
                new BigDecimal("1000.00"), null, null, null,
                30, null, "PP", 4, null,
                "REGULAR", 3, null
        );

        when(campaignTypeRepository.findByCode("REGULAR")).thenReturn(Optional.of(regularType()));
        when(repository.existsByPrefixAndActiveTrue("PP")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.vouchersPerReceipt()).isEqualTo(3);
        verify(repository).save(any());
    }

    @Test
    @DisplayName("create: REGULAR — vouchersPerReceipt null → default 1")
    void create_RegularType_NullVouchersPerReceipt_DefaultsToOne() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Campanie Default", LocalDate.now(), LocalDate.now().plusMonths(1),
                "FIXED", new BigDecimal("10.00"), null,
                new BigDecimal("100.00"), null, null, null,
                30, null, "DEF", 4, null,
                "REGULAR", null, null
        );

        when(campaignTypeRepository.findByCode("REGULAR")).thenReturn(Optional.of(regularType()));
        when(repository.existsByPrefixAndActiveTrue("DEF")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.vouchersPerReceipt()).isEqualTo(1);
        verify(repository).save(any());
    }

    // --- 4. getAll ---

    @Test
    void getAll_ReturnsList() {
        when(repository.findAll()).thenReturn(List.of(new VoucherCampaign(), new VoucherCampaign()));
        assertThat(service.getAll()).hasSize(2);
    }

    @Test
    void getAll_ReturnsEmpty() {
        when(repository.findAll()).thenReturn(List.of());
        assertThat(service.getAll()).isEmpty();
    }

    // --- 5. getActiveCampaigns ---

    @Test
    void getActiveCampaigns_ReturnsOnlyActive() {
        when(repository.findAllByActiveTrue()).thenReturn(List.of(new VoucherCampaign()));
        assertThat(service.getActiveCampaigns()).hasSize(1);
    }

    @Test
    void getActiveCampaigns_Empty() {
        when(repository.findAllByActiveTrue()).thenReturn(List.of());
        assertThat(service.getActiveCampaigns()).isEmpty();
    }

    // --- 6. getInactiveCampaigns ---

    @Test
    void getInactiveCampaigns_ReturnsOnlyInactive() {
        when(repository.findAllByActiveFalse()).thenReturn(List.of(new VoucherCampaign()));
        assertThat(service.getInactiveCampaigns()).hasSize(1);
    }

    @Test
    void getInactiveCampaigns_Empty() {
        when(repository.findAllByActiveFalse()).thenReturn(List.of());
        assertThat(service.getInactiveCampaigns()).isEmpty();
    }

    // --- 7. toggleStatus ---

    @Test
    @DisplayName("toggleStatus: Schimbă din activ în inactiv")
    void toggleStatus_ActiveToInactive_Success() {
        VoucherCampaign campaign = VoucherCampaign.builder().id(1).active(true).build();
        when(repository.findById(1)).thenReturn(Optional.of(campaign));
        when(repository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        var response = service.toggleStatus(1);

        assertThat(response.active()).isFalse();
        verify(repository).save(campaign);
    }

    @Test
    @DisplayName("toggleStatus: Schimbă din inactiv în activ")
    void toggleStatus_InactiveToActive_Success() {
        VoucherCampaign campaign = VoucherCampaign.builder().id(2).active(false).build();
        when(repository.findById(2)).thenReturn(Optional.of(campaign));
        when(repository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        var response = service.toggleStatus(2);

        assertThat(response.active()).isTrue();
        verify(repository).save(campaign);
    }

    @Test
    @DisplayName("toggleStatus: Eroare ID inexistent")
    void toggleStatus_NotFound_ThrowsException() {
        when(repository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleStatus(99))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND");
    }
}

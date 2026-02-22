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
    @Mock private ProductRepository productRepository; // <--- DEPENDENȚĂ NOUĂ

    @InjectMocks private VoucherCampaignService service;

    private VoucherCampaignDTOs.Request createValidRequest() {
        return new VoucherCampaignDTOs.Request(
                "Campanie Vara", LocalDate.now(), LocalDate.now().plusMonths(1),
                "PERCENT", new BigDecimal("10.00"), new BigDecimal("50.00"), // discountValue, maxDiscountAmount
                new BigDecimal("50.00"), // minAmount
                1, // minHoursPlayed
                1, // requiredProductId (Există în request-ul valid)
                null, // applicableProductId
                30, "12345", "V-", 4, "Template"
        );
    }

    // --- 1. create (TESTE DE SUCCES & VALIDĂRI) ---

    @Test
    @DisplayName("create: Succes cu date valide")
    void create_Success() {
        VoucherCampaignDTOs.Request req = createValidRequest();
        
        // Simulăm că produsul cu ID 1 (din request) există, altfel pică validarea
        when(productRepository.existsById(1)).thenReturn(true);
        // Simulăm că prefixul nu e duplicat
        when(repository.existsByPrefixAndActiveTrue("V-")).thenReturn(false);
        
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.name()).isEqualTo("Campanie Vara");
        verify(repository).save(any());
    }

    @Test
    @DisplayName("create: Eroare la interval de date invalid")
    void create_InvalidDates_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now().plusDays(10), LocalDate.now(), // End < Start
                "FIXED", BigDecimal.TEN, BigDecimal.valueOf(5), // discountValue, maxDiscountAmount
                BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, ""
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE");
    }

    @Test
    @DisplayName("create: Eroare produs necesar inexistent")
    void create_RequiredProductNotFound_ThrowsException() {
        VoucherCampaignDTOs.Request req = createValidRequest();
        // Setăm repository să zică FALSE la check-ul de produs
        when(productRepository.existsById(req.requiredProductId())).thenReturn(false);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.REQUIRED_PRODUCT_NOT_FOUND");
    }
    
    @Test
    @DisplayName("create: Eroare produs aplicabil inexistent")
    void create_ApplicableProductNotFound_ThrowsException() {
        // Creăm un request care are applicableProductId = 99
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now(), LocalDate.now().plusDays(1),
                "FIXED", BigDecimal.TEN, BigDecimal.valueOf(5), // discountValue, maxDiscountAmount
                BigDecimal.ZERO, 0, 
                null, 99, // ID Inexistent
                30, "1", "P", 4, ""
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
                "FIXED", new BigDecimal("-5.00"), BigDecimal.valueOf(5), // discountValue (negativ), maxDiscountAmount
                BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, ""
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
                "PERCENT", new BigDecimal("105.00"), BigDecimal.valueOf(5), // discountValue (>100), maxDiscountAmount
                BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, ""
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.PERCENT_OVER_100");
    }

    @Test
    @DisplayName("create: Eroare prefix deja existent")
    void create_DuplicatePrefix_ThrowsException() {
        VoucherCampaignDTOs.Request req = createValidRequest(); // are prefix "V-"
        
        // Simulăm că produsul există (ca să treacă de validarea produsului)
        when(productRepository.existsById(1)).thenReturn(true);
        // Simulăm că prefixul EXISTĂ deja activ
        when(repository.existsByPrefixAndActiveTrue("V-")).thenReturn(true);

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.PREFIX_ALREADY_ACTIVE");
    }

    @Test
    @DisplayName("create: Succes FIXED discount fără maxDiscountAmount")
    void create_FixedDiscount_WithoutMaxDiscountAmount_Success() {
        // Crează request cu FIXED discount și maxDiscountAmount = null
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Campanie FIXED", LocalDate.now(), LocalDate.now().plusMonths(1),
                "FIXED", new BigDecimal("50.00"), null, // discountValue=50, maxDiscountAmount=null
                new BigDecimal("50.00"), 1, 1, null, 30, "12345", "F-", 4, "Template"
        );

        when(productRepository.existsById(1)).thenReturn(true);
        when(repository.existsByPrefixAndActiveTrue("F-")).thenReturn(false);
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        // Ar trebui să treacă fără eroare (maxDiscountAmount nu e necesar pentru FIXED)
        var response = service.create(req);
        assertThat(response.name()).isEqualTo("Campanie FIXED");
        verify(repository).save(any());
    }

    @Test
    @DisplayName("create: Eroare PERCENT discount fără maxDiscountAmount")
    void create_PercentDiscount_WithoutMaxDiscountAmount_ThrowsException() {
        // Crează request cu PERCENT discount și maxDiscountAmount = null
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Campanie PERCENT", LocalDate.now(), LocalDate.now().plusMonths(1),
                "PERCENT", new BigDecimal("10.00"), null, // discountValue=10%, maxDiscountAmount=null
                new BigDecimal("50.00"), 1, 1, null, 30, "12345", "P-", 4, "Template"
        );

        when(productRepository.existsById(1)).thenReturn(true);

        // Ar trebui să arunce eroare (maxDiscountAmount e obligatoriu pentru PERCENT)
        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.MAX_DISCOUNT_REQUIRED");
    }

    // --- 2. getAll ---
    @Test void getAll_ReturnsList() {
        when(repository.findAll()).thenReturn(List.of(new VoucherCampaign(), new VoucherCampaign()));
        assertThat(service.getAll()).hasSize(2);
    }

    @Test void getAll_ReturnsEmpty() {
        when(repository.findAll()).thenReturn(List.of());
        assertThat(service.getAll()).isEmpty();
    }

    // --- 3. getActiveCampaigns ---
    @Test void getActiveCampaigns_ReturnsOnlyActive() {
        when(repository.findAllByActiveTrue()).thenReturn(List.of(new VoucherCampaign()));
        assertThat(service.getActiveCampaigns()).hasSize(1);
    }

    @Test void getActiveCampaigns_Empty() {
        when(repository.findAllByActiveTrue()).thenReturn(List.of());
        assertThat(service.getActiveCampaigns()).isEmpty();
    }

    // --- 4. getInactiveCampaigns ---
    @Test void getInactiveCampaigns_ReturnsOnlyInactive() {
        when(repository.findAllByActiveFalse()).thenReturn(List.of(new VoucherCampaign()));
        assertThat(service.getInactiveCampaigns()).hasSize(1);
    }

    @Test void getInactiveCampaigns_Empty() {
        when(repository.findAllByActiveFalse()).thenReturn(List.of());
        assertThat(service.getInactiveCampaigns()).isEmpty();
    }

    // --- 5. toggleStatus ---
    @Test @DisplayName("toggleStatus: Schimbă din activ în inactiv")
    void toggleStatus_Success() {
        VoucherCampaign campaign = VoucherCampaign.builder().id(1).active(true).build();
        when(repository.findById(1)).thenReturn(Optional.of(campaign));
        when(repository.save(any())).thenAnswer(i -> i.getArguments()[0]);

        var response = service.toggleStatus(1);

        assertThat(response.active()).isFalse();
        verify(repository).save(campaign);
    }

    @Test @DisplayName("toggleStatus: Eroare ID inexistent")
    void toggleStatus_NotFound_ThrowsException() {
        when(repository.findById(99)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggleStatus(99))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.NOT_FOUND");
    }
}
package com.sellbit.domain.voucher.vouchercampaign;

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
    @InjectMocks private VoucherCampaignService service;

    private VoucherCampaignDTOs.Request createValidRequest() {
        return new VoucherCampaignDTOs.Request(
                "Campanie Vara", LocalDate.now(), LocalDate.now().plusMonths(1),
                "PERCENT", new BigDecimal("10.00"), new BigDecimal("50.00"),
                1, null, null, 30, "12345", "V-", 4, "Template"
        );
    }

    // --- 1. create ---
    @Test @DisplayName("create: Succes cu date valide")
    void create_Success() {
        VoucherCampaignDTOs.Request req = createValidRequest();
        when(repository.save(any(VoucherCampaign.class))).thenAnswer(i -> i.getArguments()[0]);

        var response = service.create(req);

        assertThat(response.name()).isEqualTo("Campanie Vara");
        verify(repository).save(any());
    }

    @Test @DisplayName("create: Eroare la interval de date invalid")
    void create_InvalidDates_ThrowsException() {
        VoucherCampaignDTOs.Request req = new VoucherCampaignDTOs.Request(
                "Nume", LocalDate.now().plusDays(10), LocalDate.now(), // Data de final e inaintea celei de inceput
                "FIXED", BigDecimal.TEN, BigDecimal.ZERO, 0, null, null, 30, "1", "P", 4, ""
        );

        assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE");
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
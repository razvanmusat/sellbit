package com.sellbit.domain.sales.receipt;

import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TurnoverReportServiceTest {

    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0);
    private static final LocalDateTime END = LocalDateTime.of(2026, 10, 31, 23, 59, 59);
    private static final int WAREHOUSE_ID = 7;

    @Mock
    private ReceiptItemRepository itemRepository;

    @InjectMocks
    private ReceiptService receiptService;

    /** Un rând per (bon, cotă): [receiptId, closedAt, vatRate, net, vat, total]. */
    private static Object[] row(int receiptId, LocalDateTime closedAt, String rate, String net, String vat, String total) {
        return new Object[] { receiptId, closedAt, new BigDecimal(rate), new BigDecimal(net), new BigDecimal(vat), new BigDecimal(total) };
    }

    private static LocalDateTime at(int day, int hour) {
        return LocalDateTime.of(2026, 10, day, hour, 0);
    }

    private void givenRows(Object[]... rows) {
        when(itemRepository.findTurnoverRows(START, END, WAREHOUSE_ID)).thenReturn(List.of(rows));
    }

    private TurnoverReportDTO.Response report() {
        return receiptService.getTurnoverReport(START, END, WAREHOUSE_ID);
    }

    @Test
    @DisplayName("Fără bonuri: totaluri zero și liste goale")
    void noReceipts_returnsZerosAndEmptyLists() {
        when(itemRepository.findTurnoverRows(START, END, WAREHOUSE_ID)).thenReturn(Collections.emptyList());

        var result = report();

        assertEquals(0, result.receiptCount());
        assertEquals(0, BigDecimal.ZERO.compareTo(result.net()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.vat()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.total()));
        assertTrue(result.byVatRate().isEmpty());
        assertTrue(result.byDay().isEmpty());
    }

    @Test
    @DisplayName("Transmite perioada și gestiunea către repository")
    void passesArgumentsToRepository() {
        when(itemRepository.findTurnoverRows(START, END, WAREHOUSE_ID)).thenReturn(Collections.emptyList());

        report();

        verify(itemRepository).findTurnoverRows(START, END, WAREHOUSE_ID);
    }

    @Test
    @DisplayName("Un bon cu o singură cotă: totalul, cota și ziua au aceleași sume")
    void singleReceiptSingleRate() {
        givenRows(row(1, at(5, 10), "19.00", "100.00", "19.00", "119.00"));

        var result = report();

        assertEquals(1, result.receiptCount());
        assertEquals(0, new BigDecimal("100.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("19.00").compareTo(result.vat()));
        assertEquals(0, new BigDecimal("119.00").compareTo(result.total()));

        assertEquals(1, result.byVatRate().size());
        var rate = result.byVatRate().get(0);
        assertEquals(0, new BigDecimal("19").compareTo(rate.vatRate()));
        assertEquals(1, rate.receiptCount());
        assertEquals(0, new BigDecimal("119.00").compareTo(rate.total()));

        assertEquals(1, result.byDay().size());
        var day = result.byDay().get(0);
        assertEquals(LocalDate.of(2026, 10, 5), day.day());
        assertEquals(1, day.receiptCount());
        assertEquals(0, new BigDecimal("100.00").compareTo(day.net()));
    }

    @Test
    @DisplayName("Un bon cu două cote: se numără o singură dată în total și în zi, o dată pe fiecare cotă")
    void receiptWithTwoRates_countedOncePerBucket() {
        givenRows(
                row(1, at(5, 10), "19.00", "100.00", "19.00", "119.00"),
                row(1, at(5, 10), "9.00", "50.00", "4.50", "54.50"));

        var result = report();

        assertEquals(1, result.receiptCount());
        assertEquals(0, new BigDecimal("150.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("23.50").compareTo(result.vat()));
        assertEquals(0, new BigDecimal("173.50").compareTo(result.total()));

        assertEquals(2, result.byVatRate().size());
        assertTrue(result.byVatRate().stream().allMatch(r -> r.receiptCount() == 1));

        assertEquals(1, result.byDay().size());
        assertEquals(1, result.byDay().get(0).receiptCount());
        assertEquals(0, new BigDecimal("173.50").compareTo(result.byDay().get(0).total()));
    }

    @Test
    @DisplayName("Cotele sunt sortate crescător")
    void vatRatesSortedAscending() {
        givenRows(
                row(1, at(5, 10), "19.00", "100.00", "19.00", "119.00"),
                row(2, at(5, 11), "5.00", "10.00", "0.50", "10.50"),
                row(3, at(5, 12), "9.00", "20.00", "1.80", "21.80"));

        var rates = report().byVatRate();

        assertEquals(List.of(0, 0, 0), List.of(
                new BigDecimal("5").compareTo(rates.get(0).vatRate()),
                new BigDecimal("9").compareTo(rates.get(1).vatRate()),
                new BigDecimal("19").compareTo(rates.get(2).vatRate())));
    }

    @Test
    @DisplayName("Aceeași cotă scrisă diferit (19 și 19.00) se unește într-un singur rând")
    void sameRateDifferentScale_mergedIntoOneRow() {
        givenRows(
                new Object[] { 1, at(5, 10), new BigDecimal("19"), new BigDecimal("100.00"), new BigDecimal("19.00"), new BigDecimal("119.00") },
                new Object[] { 2, at(6, 10), new BigDecimal("19.00"), new BigDecimal("200.00"), new BigDecimal("38.00"), new BigDecimal("238.00") });

        var result = report();

        assertEquals(1, result.byVatRate().size());
        var rate = result.byVatRate().get(0);
        assertEquals(2, rate.receiptCount());
        assertEquals(0, new BigDecimal("300.00").compareTo(rate.net()));
        assertEquals(0, new BigDecimal("357.00").compareTo(rate.total()));
    }

    @Test
    @DisplayName("Zilele sunt sortate crescător, iar bonurile din aceeași zi se adună")
    void daysSortedAndReceiptsOfSameDayGrouped() {
        givenRows(
                row(3, at(12, 9), "19.00", "30.00", "5.70", "35.70"),
                row(1, at(3, 8), "19.00", "100.00", "19.00", "119.00"),
                row(2, at(3, 18), "19.00", "50.00", "9.50", "59.50"));

        var result = report();

        assertEquals(3, result.receiptCount());
        assertEquals(2, result.byDay().size());

        var first = result.byDay().get(0);
        assertEquals(LocalDate.of(2026, 10, 3), first.day());
        assertEquals(2, first.receiptCount());
        assertEquals(0, new BigDecimal("150.00").compareTo(first.net()));
        assertEquals(0, new BigDecimal("28.50").compareTo(first.vat()));
        assertEquals(0, new BigDecimal("178.50").compareTo(first.total()));

        var second = result.byDay().get(1);
        assertEquals(LocalDate.of(2026, 10, 12), second.day());
        assertEquals(1, second.receiptCount());
    }

    @Test
    @DisplayName("Ziua se ia din data închiderii, inclusiv la limita de miezul nopții")
    void dayTakenFromClosedAt_atMidnightBoundary() {
        givenRows(
                row(1, LocalDateTime.of(2026, 10, 4, 23, 59, 59), "19.00", "10.00", "1.90", "11.90"),
                row(2, LocalDateTime.of(2026, 10, 5, 0, 0, 0), "19.00", "20.00", "3.80", "23.80"));

        var days = report().byDay();

        assertEquals(2, days.size());
        assertEquals(LocalDate.of(2026, 10, 4), days.get(0).day());
        assertEquals(LocalDate.of(2026, 10, 5), days.get(1).day());
    }

    @Test
    @DisplayName("Totalul general e suma pe cote și suma pe zile")
    void totalsAreConsistentAcrossBreakdowns() {
        givenRows(
                row(1, at(1, 10), "19.00", "100.00", "19.00", "119.00"),
                row(1, at(1, 10), "9.00", "50.00", "4.50", "54.50"),
                row(2, at(2, 10), "19.00", "200.00", "38.00", "238.00"),
                row(3, at(2, 15), "5.00", "10.00", "0.50", "10.50"));

        var result = report();

        BigDecimal netByRate = result.byVatRate().stream().map(TurnoverReportDTO.VatRateRow::net).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netByDay = result.byDay().stream().map(TurnoverReportDTO.DayRow::net).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalByRate = result.byVatRate().stream().map(TurnoverReportDTO.VatRateRow::total).reduce(BigDecimal.ZERO, BigDecimal::add);

        assertEquals(3, result.receiptCount());
        assertEquals(0, new BigDecimal("360.00").compareTo(result.net()));
        assertEquals(0, result.net().compareTo(netByRate));
        assertEquals(0, result.net().compareTo(netByDay));
        assertEquals(0, result.total().compareTo(totalByRate));
        assertEquals(0, result.net().add(result.vat()).compareTo(result.total()));
    }
}

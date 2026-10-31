package com.sellbit.domain.sales.receipt;

import com.sellbit.domain.catalog.product.Product;
import com.sellbit.domain.catalog.product.ProductRepository;
import com.sellbit.domain.lookup.vatrate.VatRate;
import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import com.sellbit.domain.sales.receiptpayment.ReceiptPaymentRepository;
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

    @Mock
    private ReceiptPaymentRepository paymentRepository;

    @Mock
    private ProductRepository productRepository;

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

    /** Plată cu avans pe un bon final: [closedAt, amount]. */
    private static Object[] advancePayment(LocalDateTime closedAt, String amount) {
        return new Object[] { closedAt, new BigDecimal(amount) };
    }

    private void givenAdvanceProduct(String vatRate) {
        Product advance = Product.builder().vatRate(VatRate.builder().rate(new BigDecimal(vatRate)).build()).build();
        when(productRepository.findByProductTypeCode("ADVANCE")).thenReturn(List.of(advance));
    }

    private void givenAdvancePayments(Object[]... payments) {
        when(paymentRepository.findAdvancePayments(START, END, WAREHOUSE_ID)).thenReturn(List.of(payments));
    }

    @Test
    @DisplayName("Avans: bonul de avans intră în ziua încasării, iar plata cu avans de pe bonul final se scade")
    void advanceReceiptCountedAndAdvancePaymentSubtracted() {
        // avans 121 încasat pe 5 (net 100, TVA 21); petrecere pe 20 la 363 cu TVA (net 300, TVA 63), din care 121 plătit cu avans
        givenRows(
                row(1, at(5, 10), "21.00", "100.00", "21.00", "121.00"),
                row(2, at(20, 18), "21.00", "300.00", "63.00", "363.00"));
        givenAdvanceProduct("21.00");
        givenAdvancePayments(advancePayment(at(20, 18), "121.00"));

        var result = report();

        assertEquals(2, result.receiptCount());
        assertEquals(0, new BigDecimal("300.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("63.00").compareTo(result.vat()));
        assertEquals(0, new BigDecimal("363.00").compareTo(result.total()));
    }

    @Test
    @DisplayName("Avans: ziua bonului final scade avansul, ziua încasării păstrează avansul")
    void advanceSubtractedOnFinalReceiptDay() {
        givenRows(
                row(1, at(5, 10), "21.00", "100.00", "21.00", "121.00"),
                row(2, at(20, 18), "21.00", "300.00", "63.00", "363.00"));
        givenAdvanceProduct("21.00");
        givenAdvancePayments(advancePayment(at(20, 18), "121.00"));

        var days = report().byDay();

        assertEquals(2, days.size());
        assertEquals(LocalDate.of(2026, 10, 5), days.get(0).day());
        assertEquals(0, new BigDecimal("121.00").compareTo(days.get(0).total()));
        assertEquals(LocalDate.of(2026, 10, 20), days.get(1).day());
        assertEquals(0, new BigDecimal("242.00").compareTo(days.get(1).total()));
        assertEquals(1, days.get(1).receiptCount());
    }

    @Test
    @DisplayName("Avans: scăderea se face pe cota produsului de avans, iar numărul de bonuri pe cotă nu se schimbă")
    void advanceSubtractedOnAdvanceVatRate() {
        givenRows(
                row(1, at(5, 10), "21.00", "100.00", "21.00", "121.00"),
                row(2, at(20, 18), "21.00", "300.00", "63.00", "363.00"));
        givenAdvanceProduct("21.00");
        givenAdvancePayments(advancePayment(at(20, 18), "121.00"));

        var rates = report().byVatRate();

        assertEquals(1, rates.size());
        assertEquals(2, rates.get(0).receiptCount());
        assertEquals(0, new BigDecimal("300.00").compareTo(rates.get(0).net()));
        assertEquals(0, new BigDecimal("63.00").compareTo(rates.get(0).vat()));
    }

    @Test
    @DisplayName("Avans anulat sau eveniment privat: doar bonul de avans, fără bon final, rămâne numărat")
    void advanceWithoutFinalReceiptStaysCounted() {
        givenRows(row(1, at(5, 10), "21.00", "100.00", "21.00", "121.00"));
        givenAdvanceProduct("21.00");

        var result = report();

        assertEquals(1, result.receiptCount());
        assertEquals(0, new BigDecimal("100.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("121.00").compareTo(result.total()));
    }

    @Test
    @DisplayName("Avans: mai multe plăți cu avans pe aceeași zi se adună")
    void severalAdvancePaymentsAreSummed() {
        givenRows(row(2, at(20, 18), "21.00", "600.00", "126.00", "726.00"));
        givenAdvanceProduct("21.00");
        givenAdvancePayments(advancePayment(at(20, 18), "121.00"), advancePayment(at(20, 20), "121.00"));

        var result = report();

        assertEquals(0, new BigDecimal("484.00").compareTo(result.total()));
        assertEquals(0, new BigDecimal("400.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("84.00").compareTo(result.vat()));
    }

    @Test
    @DisplayName("Avans: plata cu avans pe o zi fără linii în gestiune creează rând cu 0 bonuri și sumă negativă")
    void advancePaymentOnDayWithoutLines() {
        givenRows(row(1, at(5, 10), "21.00", "100.00", "21.00", "121.00"));
        givenAdvanceProduct("21.00");
        givenAdvancePayments(advancePayment(at(9, 12), "121.00"));

        var days = report().byDay();

        assertEquals(2, days.size());
        assertEquals(LocalDate.of(2026, 10, 9), days.get(1).day());
        assertEquals(0, days.get(1).receiptCount());
        assertEquals(0, new BigDecimal("-121.00").compareTo(days.get(1).total()));
    }

    @Test
    @DisplayName("Avans: partea de TVA se calculează din suma plătită cu avans, cu cota produsului de avans")
    void advanceVatSplitUsesAdvanceProductRate() {
        givenRows(row(1, at(20, 18), "9.00", "1000.00", "90.00", "1090.00"));
        givenAdvanceProduct("9.00");
        givenAdvancePayments(advancePayment(at(20, 18), "109.00"));

        var result = report();

        assertEquals(0, new BigDecimal("900.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("81.00").compareTo(result.vat()));
        assertEquals(0, new BigDecimal("981.00").compareTo(result.total()));
    }

    @Test
    @DisplayName("Fără plăți cu avans, produsul de avans nu e necesar și rezultatul nu se schimbă")
    void noAdvancePayments_unchanged() {
        givenRows(row(1, at(5, 10), "19.00", "100.00", "19.00", "119.00"));

        var result = report();

        assertEquals(0, new BigDecimal("100.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("119.00").compareTo(result.total()));
    }

    @Test
    @DisplayName("Avans fără produs de avans în catalog: cota e 0, deci plata se scade integral din net, fără TVA")
    void advancePaymentWithoutAdvanceProduct_rateZero() {
        givenRows(row(1, at(20, 18), "21.00", "100.00", "21.00", "121.00"));
        givenAdvancePayments(advancePayment(at(20, 18), "121.00"));

        var result = report();

        assertEquals(1, result.receiptCount());
        assertEquals(0, new BigDecimal("-21.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("21.00").compareTo(result.vat()));
        assertEquals(0, BigDecimal.ZERO.compareTo(result.total()));

        var rates = result.byVatRate();
        assertEquals(2, rates.size());
        assertEquals(0, BigDecimal.ZERO.compareTo(rates.get(0).vatRate()));
        assertEquals(0, rates.get(0).receiptCount());
        assertEquals(0, new BigDecimal("-121.00").compareTo(rates.get(0).net()));
        assertEquals(0, BigDecimal.ZERO.compareTo(rates.get(0).vat()));
        assertEquals(0, new BigDecimal("21").compareTo(rates.get(1).vatRate()));
        assertEquals(1, rates.get(1).receiptCount());
        assertEquals(0, new BigDecimal("121.00").compareTo(rates.get(1).total()));
    }

    @Test
    @DisplayName("Avans mai mare decât ce rămâne de scăzut: rezultat negativ, fără eroare")
    void advancePaymentLargerThanReceipt_negativeResult() {
        givenRows(row(1, at(20, 18), "21.00", "100.00", "21.00", "121.00"));
        givenAdvanceProduct("21.00");
        givenAdvancePayments(advancePayment(at(20, 18), "242.00"));

        var result = report();

        assertEquals(1, result.receiptCount());
        assertEquals(0, new BigDecimal("-100.00").compareTo(result.net()));
        assertEquals(0, new BigDecimal("-21.00").compareTo(result.vat()));
        assertEquals(0, new BigDecimal("-121.00").compareTo(result.total()));
        assertEquals(0, new BigDecimal("-121.00").compareTo(result.byDay().get(0).total()));
        assertEquals(0, new BigDecimal("-121.00").compareTo(result.byVatRate().get(0).total()));
    }

    @Test
    @DisplayName("Produs de avans cu altă cotă decât liniile: scăderea apare pe cota avansului, în rând propriu")
    void advanceProductWithDifferentRate_ownRateRow() {
        givenRows(row(1, at(20, 18), "21.00", "100.00", "21.00", "121.00"));
        givenAdvanceProduct("9.00");
        givenAdvancePayments(advancePayment(at(20, 18), "109.00"));

        var result = report();

        var rates = result.byVatRate();
        assertEquals(2, rates.size());
        assertEquals(0, new BigDecimal("9").compareTo(rates.get(0).vatRate()));
        assertEquals(0, rates.get(0).receiptCount());
        assertEquals(0, new BigDecimal("-100.00").compareTo(rates.get(0).net()));
        assertEquals(0, new BigDecimal("-9.00").compareTo(rates.get(0).vat()));
        assertEquals(0, new BigDecimal("-109.00").compareTo(rates.get(0).total()));
        assertEquals(0, new BigDecimal("21").compareTo(rates.get(1).vatRate()));
        assertEquals(0, new BigDecimal("121.00").compareTo(rates.get(1).total()));

        assertEquals(0, BigDecimal.ZERO.compareTo(result.net()));
        assertEquals(0, new BigDecimal("12.00").compareTo(result.vat()));
        assertEquals(0, new BigDecimal("12.00").compareTo(result.total()));
    }
}

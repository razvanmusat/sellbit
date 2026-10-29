package com.sellbit.domain.sales.receipt;

import com.sellbit.domain.sales.receiptitem.ReceiptItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarkupReportServiceTest {

    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0);
    private static final LocalDateTime END = LocalDateTime.of(2026, 10, 31, 23, 59, 59);

    @Mock
    private ReceiptItemRepository itemRepository;

    @InjectMocks
    private ReceiptService receiptService;

    /** Un rând per produs: [productId, productName, cost, net]. Costul și net conțin doar liniile cu achiziție > 0. */
    private static Object[] row(int productId, String name, String cost, String net) {
        return new Object[] { productId, name, new BigDecimal(cost), new BigDecimal(net) };
    }

    private void givenRows(Object[]... rows) {
        when(itemRepository.findMarkupRows(START, END)).thenReturn(List.of(rows));
    }

    private MarkupReportDTO.Response report() {
        return receiptService.getMarkupReport(START, END);
    }

    private static void assertAmount(String expected, BigDecimal actual) {
        assertNotNull(actual);
        assertEquals(0, new BigDecimal(expected).compareTo(actual), "așteptat " + expected + " dar a fost " + actual);
    }

    @Test
    @DisplayName("Fără vânzări: adaos și procent null, listă goală")
    void noSales_nullFigures() {
        when(itemRepository.findMarkupRows(START, END)).thenReturn(Collections.emptyList());

        var result = report();

        assertTrue(result.products().isEmpty());
        assertNull(result.total().amount());
        assertNull(result.total().percent());
    }

    @Test
    @DisplayName("Transmite perioada către repository")
    void passesPeriodToRepository() {
        when(itemRepository.findMarkupRows(START, END)).thenReturn(Collections.emptyList());

        report();

        verify(itemRepository).findMarkupRows(START, END);
    }

    @Test
    @DisplayName("Un produs: adaos în sumă = vânzare - achiziție, în procent = sumă / achiziție x 100")
    void singleProduct_amountAndPercent() {
        givenRows(row(1, "Cafea", "100.00", "150.00"));

        var f = report().products().get(0).figures();

        assertAmount("50.00", f.amount());
        assertAmount("50.00", f.percent());
    }

    @Test
    @DisplayName("Procentul se rotunjește la 2 zecimale (HALF_UP)")
    void percentRoundedToTwoDecimals() {
        givenRows(row(1, "Apă", "3.00", "4.00"));

        assertEquals(new BigDecimal("33.33"), report().products().get(0).figures().percent());
    }

    @Test
    @DisplayName("Produs doar cu linii fără achiziție: sumă și procent null, nu 0 și nu 100%")
    void productWithoutAnyCost_nullFigures() {
        givenRows(row(1, "Intrare", "0.00", "0.00"));

        var f = report().products().get(0).figures();

        assertNull(f.amount());
        assertNull(f.percent());
    }

    @Test
    @DisplayName("Vânzare sub achiziție: adaos negativ")
    void saleBelowCost_negative() {
        givenRows(row(1, "Promo", "100.00", "80.00"));

        var f = report().products().get(0).figures();

        assertAmount("-20.00", f.amount());
        assertAmount("-20.00", f.percent());
    }

    @Test
    @DisplayName("Totalul global e suma produselor, iar procentul se calculează pe sume, nu ca medie de procente")
    void totalIsSumOfProductsAndPercentFromSums() {
        givenRows(
                row(1, "A", "100.00", "200.00"),
                row(2, "B", "300.00", "330.00"));

        var result = report();

        assertEquals(2, result.products().size());
        assertAmount("130.00", result.total().amount());
        assertAmount("32.50", result.total().percent());
    }

    @Test
    @DisplayName("Produsul fără achiziție NU umflă procentul global: vânzarea lui nu intră în total")
    void productWithoutCostDoesNotInflateTotal() {
        givenRows(
                row(1, "A", "100.00", "150.00"),
                row(2, "Serviciu", "0.00", "0.00"));

        var result = report();

        assertAmount("50.00", result.total().amount());
        assertAmount("50.00", result.total().percent());
    }

    @Test
    @DisplayName("Totalul e null când niciun produs nu are achiziție")
    void totalNullWhenNoProductHasCost() {
        givenRows(
                row(1, "A", "0.00", "0.00"),
                row(2, "B", "0.00", "0.00"));

        var result = report();

        assertNull(result.total().amount());
        assertNull(result.total().percent());
    }

    @Test
    @DisplayName("Păstrează id-ul, numele și ordinea produselor din repository")
    void keepsProductIdentityAndOrder() {
        givenRows(
                row(5, "Alpha", "10.00", "15.00"),
                row(2, "Beta", "10.00", "15.00"));

        var products = report().products();

        assertEquals(5, products.get(0).productId());
        assertEquals("Alpha", products.get(0).productName());
        assertEquals(2, products.get(1).productId());
        assertEquals("Beta", products.get(1).productName());
    }
}

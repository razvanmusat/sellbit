package com.sellbit.domain.sales.receipt;

import com.sellbit.domain.sales.fiscal.ReceiptFiscalService;
import com.sellbit.domain.security.auth.JwtUtils;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = ReceiptController.class,
        excludeAutoConfiguration = SecurityAutoConfiguration.class
)
class MarkupReportControllerTest {

    private static final String URL = "/api/sales/receipts/reports/markup";
    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0, 0);
    private static final LocalDateTime END = LocalDateTime.of(2026, 10, 31, 23, 59, 59);

    @Autowired private MockMvc mockMvc;

    @MockitoBean private ReceiptService receiptService;
    @MockitoBean private ReceiptFiscalService receiptFiscalService;

    @MockitoBean private JwtUtils jwtUtils;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private PasswordEncoder passwordEncoder;

    private static MarkupReportDTO.Figures figures() {
        return new MarkupReportDTO.Figures(new BigDecimal("50.00"), new BigDecimal("50.00"));
    }

    @Test
    @DisplayName("GET /reports/markup - Succes: întoarce totalul și lista pe produs")
    void getMarkup_Success() throws Exception {
        var response = new MarkupReportDTO.Response(figures(), List.of(new MarkupReportDTO.ProductRow(3, "Cafea", figures())));
        when(receiptService.getMarkupReport(START, END)).thenReturn(response);

        mockMvc.perform(get(URL)
                        .param("start", "2026-10-01T00:00:00")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total.amount").value(50.00))
                .andExpect(jsonPath("$.total.percent").value(50.00))
                .andExpect(jsonPath("$.products[0].productId").value(3))
                .andExpect(jsonPath("$.products[0].productName").value("Cafea"))
                .andExpect(jsonPath("$.products[0].figures.percent").value(50.00));

        verify(receiptService).getMarkupReport(START, END);
    }

    @Test
    @DisplayName("GET /reports/markup - Sumă și procent null când nicio linie nu are achiziție")
    void getMarkup_NullPercent() throws Exception {
        var noPercent = new MarkupReportDTO.Figures(null, null);
        when(receiptService.getMarkupReport(START, END)).thenReturn(new MarkupReportDTO.Response(noPercent, List.of()));

        mockMvc.perform(get(URL)
                        .param("start", "2026-10-01T00:00:00")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total.amount").isEmpty())
                .andExpect(jsonPath("$.total.percent").isEmpty())
                .andExpect(jsonPath("$.products").isEmpty());
    }

    @Test
    @DisplayName("GET /reports/markup - 4xx: lipsește start")
    void getMarkup_MissingStart() throws Exception {
        mockMvc.perform(get(URL).param("end", "2026-10-31T23:59:59"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /reports/markup - 4xx: lipsește end")
    void getMarkup_MissingEnd() throws Exception {
        mockMvc.perform(get(URL).param("start", "2026-10-01T00:00:00"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /reports/markup - 4xx: dată în format greșit")
    void getMarkup_BadDateFormat() throws Exception {
        mockMvc.perform(get(URL)
                        .param("start", "01-10-2026")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().is4xxClientError());
    }
}

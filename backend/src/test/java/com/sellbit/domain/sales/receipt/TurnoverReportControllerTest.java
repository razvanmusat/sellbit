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
import java.time.LocalDate;
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
class TurnoverReportControllerTest {

    private static final String URL = "/api/sales/receipts/reports/turnover";
    private static final LocalDateTime START = LocalDateTime.of(2026, 10, 1, 0, 0, 0);
    private static final LocalDateTime END = LocalDateTime.of(2026, 10, 31, 23, 59, 59);

    @Autowired private MockMvc mockMvc;

    @MockitoBean private ReceiptService receiptService;
    @MockitoBean private ReceiptFiscalService receiptFiscalService;

    @MockitoBean private JwtUtils jwtUtils;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("GET /reports/turnover - Succes: întoarce totalul, defalcarea pe cotă și pe zi")
    void getTurnover_Success() throws Exception {
        var response = new TurnoverReportDTO.Response(
                2,
                new BigDecimal("150.00"), new BigDecimal("23.50"), new BigDecimal("173.50"),
                List.of(new TurnoverReportDTO.VatRateRow(new BigDecimal("19"), 2, new BigDecimal("100.00"), new BigDecimal("19.00"), new BigDecimal("119.00"))),
                List.of(new TurnoverReportDTO.DayRow(LocalDate.of(2026, 10, 5), 2, new BigDecimal("150.00"), new BigDecimal("23.50"), new BigDecimal("173.50"))));

        when(receiptService.getTurnoverReport(START, END, 7)).thenReturn(response);

        mockMvc.perform(get(URL)
                        .param("warehouseId", "7")
                        .param("start", "2026-10-01T00:00:00")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receiptCount").value(2))
                .andExpect(jsonPath("$.net").value(150.00))
                .andExpect(jsonPath("$.vat").value(23.50))
                .andExpect(jsonPath("$.total").value(173.50))
                .andExpect(jsonPath("$.byVatRate[0].vatRate").value(19))
                .andExpect(jsonPath("$.byVatRate[0].receiptCount").value(2))
                .andExpect(jsonPath("$.byDay[0].day").value("2026-10-05"))
                .andExpect(jsonPath("$.byDay[0].total").value(173.50));

        verify(receiptService).getTurnoverReport(START, END, 7);
    }

    @Test
    @DisplayName("GET /reports/turnover - Fără bonuri: liste goale")
    void getTurnover_Empty() throws Exception {
        var response = new TurnoverReportDTO.Response(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, List.of(), List.of());
        when(receiptService.getTurnoverReport(START, END, 7)).thenReturn(response);

        mockMvc.perform(get(URL)
                        .param("warehouseId", "7")
                        .param("start", "2026-10-01T00:00:00")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receiptCount").value(0))
                .andExpect(jsonPath("$.byVatRate").isEmpty())
                .andExpect(jsonPath("$.byDay").isEmpty());
    }

    @Test
    @DisplayName("GET /reports/turnover - 4xx: lipsește warehouseId")
    void getTurnover_MissingWarehouse() throws Exception {
        mockMvc.perform(get(URL)
                        .param("start", "2026-10-01T00:00:00")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /reports/turnover - 4xx: lipsește start")
    void getTurnover_MissingStart() throws Exception {
        mockMvc.perform(get(URL)
                        .param("warehouseId", "7")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /reports/turnover - 4xx: lipsește end")
    void getTurnover_MissingEnd() throws Exception {
        mockMvc.perform(get(URL)
                        .param("warehouseId", "7")
                        .param("start", "2026-10-01T00:00:00"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("GET /reports/turnover - 4xx: dată în format greșit")
    void getTurnover_BadDateFormat() throws Exception {
        mockMvc.perform(get(URL)
                        .param("warehouseId", "7")
                        .param("start", "01-10-2026")
                        .param("end", "2026-10-31T23:59:59"))
                .andExpect(status().is4xxClientError());
    }
}

package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class TurnoverReportDTO {

        public record Response(
                        int receiptCount,
                        BigDecimal net,
                        BigDecimal vat,
                        BigDecimal total,
                        List<VatRateRow> byVatRate,
                        List<DayRow> byDay) {
        }

        public record VatRateRow(BigDecimal vatRate, int receiptCount, BigDecimal net, BigDecimal vat, BigDecimal total) {
        }

        public record DayRow(LocalDate day, int receiptCount, BigDecimal net, BigDecimal vat, BigDecimal total) {
        }
}

package com.sellbit.domain.sales.receipt;

import java.math.BigDecimal;
import java.util.List;

public class MarkupReportDTO {

        /**
         * amount = vânzare (fără TVA) - preț achiziție; percent = amount / preț achiziție x 100.
         * Se calculează doar pe liniile cu preț de achiziție > 0. Fără astfel de linii, amount și percent sunt null.
         */
        public record Figures(BigDecimal amount, BigDecimal percent) {
        }

        public record ProductRow(Integer productId, String productName, Figures figures) {
        }

        public record Response(Figures total, List<ProductRow> products) {
        }
}

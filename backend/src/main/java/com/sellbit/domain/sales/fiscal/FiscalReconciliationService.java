package com.sellbit.domain.sales.fiscal;

import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FiscalReconciliationService {

    private final ReceiptRepository receiptRepository;
    private final ReceiptFiscalService receiptFiscalService;
    private final FiscalAgentService fiscalAgentService;

    @Scheduled(fixedDelay = 30_000)
    public void reconcile() {
        List<Receipt> pending = receiptRepository.findByStatus_Code("FISCAL_PENDING");
        if (pending.isEmpty()) return;

        for (Receipt receipt : pending) {
            try {
                String status = fiscalAgentService.findStatusByExternalId("sb-" + receipt.getId());

                if ("printed".equals(status)) {
                    receiptFiscalService.completeFiscalClose(receipt.getId());
                    log.info("Bon #{} inchis automat prin reconciliere fiscala", receipt.getId());
                } else if ("failed".equals(status)) {
                    receiptFiscalService.markFiscalFailed(receipt.getId());
                    log.warn("Bon #{} marcat FISCAL_FAILED: Fisco a raportat failed", receipt.getId());
                } else if ("not_found".equals(status)) {
                    // Fisco e reachabil dar nu stie de acest job → n-a fost trimis sau a expirat din ultimele 100
                    receiptFiscalService.markFiscalFailed(receipt.getId());
                    log.warn("Bon #{} marcat FISCAL_FAILED: job inexistent in Fisco", receipt.getId());
                }
                // null = Fisco inaccesibil → retry la ciclul urmator
            } catch (Exception e) {
                log.warn("Reconciliere bon #{} esuat: {}", receipt.getId(), e.getMessage());
            }
        }
    }
}

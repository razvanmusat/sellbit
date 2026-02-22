package com.sellbit.domain.voucher.customervoucher;

import com.sellbit.domain.sales.receipt.Receipt;
import com.sellbit.domain.sales.receipt.ReceiptRepository;
import com.sellbit.domain.sales.receiptitem.ReceiptItem;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaign;
import com.sellbit.domain.voucher.vouchercampaign.VoucherCampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class CustomerVoucherService {

    private final CustomerVoucherRepository voucherRepository;
    private final VoucherCampaignRepository campaignRepository;
    private final ReceiptRepository receiptRepository;
    
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    // --- METODE DE LISTARE ---

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getAllVouchers() {
        return voucherRepository.findAll().stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getUsedVouchers() {
        return voucherRepository.findAllByUsedTrueOrderByUsedAtDesc().stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getAvailableVouchers() {
        return voucherRepository.findAvailable(LocalDateTime.now()).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getAvailableVouchers(LocalDate fromDate, LocalDate toDate) {
        return voucherRepository.findAvailableBetween(fromDate, toDate, LocalDateTime.now()).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CustomerVoucherDTOs.SummaryResponse> getUsedVouchers(LocalDate fromDate, LocalDate toDate) {
        return voucherRepository.findUsedBetween(fromDate, toDate).stream()
                .map(this::mapToSummary)
                .collect(Collectors.toList());
    }

    // --- LOGICA DE VALIDARE & CONSUM ---

    @Transactional(readOnly = true)
    public CustomerVoucherDTOs.ValidationResponse validateCode(String code) {
    	if (code == null) throw new RuntimeException("ERROR.CODE_REQUIRED");
    	code = code.trim().toUpperCase();
    	
        CustomerVoucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("ERROR.CUSTOMER_VOUCHER.NOT_FOUND"));

        String errorCode = null;
        boolean isValid = true;

        if (Boolean.TRUE.equals(voucher.getUsed())) {
            errorCode = "ERROR.CUSTOMER_VOUCHER.ALREADY_USED";
            isValid = false;
        } else if (voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            errorCode = "ERROR.CUSTOMER_VOUCHER.EXPIRED";
            isValid = false;
        } else if (!isDayValid(voucher.getCampaign())) {
            errorCode = "ERROR.CUSTOMER_VOUCHER.INVALID_DAY";
            isValid = false;
        }

        return new CustomerVoucherDTOs.ValidationResponse(
                voucher.getCode(),
                voucher.getDiscountType(),
                voucher.getDiscountValue(),
                voucher.getExpiresAt(),
                voucher.getCreatedAt(),
            resolveUsedAt(voucher),
                getStatus(voucher),
                isValid,
                errorCode
        );
    }

    @Transactional
    public void consumeVoucher(String code, Integer receiptId) {
        Receipt receipt = null;
        if (receiptId != null) {
            receipt = receiptRepository.findById(receiptId)
                    .orElseThrow(() -> new RuntimeException("ERROR.RECEIPT.NOT_FOUND"));
        }
        consumeVoucher(code, receipt);
    }

    @Transactional
    public void consumeVoucher(String code, Receipt receipt) {
    	if (code == null) throw new RuntimeException("ERROR.CODE_REQUIRED");
    	code = code.trim().toUpperCase();
    	
        CustomerVoucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("ERROR.CUSTOMER_VOUCHER.NOT_FOUND"));

        if (Boolean.TRUE.equals(voucher.getUsed())) {
            throw new RuntimeException("ERROR.CUSTOMER_VOUCHER.ALREADY_USED");
        }

        voucher.setUsed(true);
        voucher.setUsedReceipt(receipt);
        voucher.setUsedAt(receipt != null && receipt.getClosedAt() != null ? receipt.getClosedAt() : LocalDateTime.now());
        voucherRepository.save(voucher);
    }
    
    private String generateUniqueCode(String prefix, int length) {
        String code;
        // Ne asigurăm că prefixul nu este null și îl transformăm în Uppercase
        String safePrefix = (prefix != null && !prefix.isBlank()) ? prefix.toUpperCase() : "";
        
        do {
            StringBuilder sb = new StringBuilder(safePrefix);
            
            // Dacă avem prefix, adăugăm cratima de separare
            if (!safePrefix.isEmpty()) {
                sb.append("-");
            }

            for (int i = 0; i < length; i++) {
                sb.append(CHARS.charAt(random.nextInt(CHARS.length())));
            }
            code = sb.toString();
        } while (voucherRepository.existsByCode(code));
        
        return code;
    }

    private boolean isDayValid(VoucherCampaign campaign) {
        if (campaign.getApplicableDays() == null || campaign.getApplicableDays().isBlank()) {
            return true;
        }
        String today = String.valueOf(LocalDate.now().getDayOfWeek().getValue());
        return campaign.getApplicableDays().contains(today);
    }

    private CustomerVoucherDTOs.SummaryResponse mapToSummary(CustomerVoucher v) {
        return new CustomerVoucherDTOs.SummaryResponse(
                v.getId(),
                v.getCode(),
                v.getCampaign().getName(),
                v.getDiscountType(),
                v.getDiscountValue(),
                v.getExpiresAt(),
                getStatus(v),
                v.getUsed(),
                v.getCreatedAt(),
                resolveUsedAt(v),
                v.getIssuedReceipt() != null ? v.getIssuedReceipt().getId() : null,
                v.getUsedReceipt() != null ? v.getUsedReceipt().getId() : null
        );
    }

    private LocalDateTime resolveUsedAt(CustomerVoucher voucher) {
        if (voucher.getUsedAt() != null) {
            return voucher.getUsedAt();
        }
        if (voucher.getUsedReceipt() != null) {
            return voucher.getUsedReceipt().getClosedAt();
        }
        return null;
    }

    private String getStatus(CustomerVoucher voucher) {
        if (Boolean.TRUE.equals(voucher.getUsed())) {
            return "USED";
        }
        if (voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(LocalDateTime.now())) {
            return "EXPIRED";
        }
        return "AVAILABLE";
    }
    
    /**
     * Calculează valoarea monetară a unui voucher raportată la un bon specific.
     * Această sumă va fi folosită ulterior ca 'amount' în ReceiptPayment.
     */
    public BigDecimal calculateVoucherValue(CustomerVoucher voucher, Receipt receipt) {
        String type = voucher.getDiscountType(); // PERCENT, FIXED, FREE_HOURS
        BigDecimal val = voucher.getDiscountValue();
        Integer targetProductId = voucher.getCampaign().getApplicableProductId();

        // CAZ 1: Sumă fixă
        if ("FIXED".equals(type)) {
            // Dacă campania cere un produs specific, verificăm dacă există pe bon
            if (targetProductId != null) {
                boolean hasProduct = receipt.getItems().stream()
                        .anyMatch(item -> item.getProduct().getId().equals(targetProductId));
                
                if (!hasProduct) {
                    // Produsul țintă nu e pe bon → voucher nu se aplică
                    return BigDecimal.ZERO;
                }
            }
            
            // Voucher valid → returnăm suma fixă (max totalul bonului)
            return val.min(receipt.getTotalAmount());
        }

        // CAZ 2: Procentual
        if ("PERCENT".equals(type)) {
            BigDecimal baseAmount;
            
            if (targetProductId != null) {
                // Verificăm mai întâi dacă produsul există pe bon
                boolean hasProduct = receipt.getItems().stream()
                        .anyMatch(item -> item.getProduct().getId().equals(targetProductId));
                
                if (!hasProduct) {
                    return BigDecimal.ZERO;
                }
                
                // Aplicăm procentul doar la liniile care au acel produs
                baseAmount = receipt.getItems().stream()
                        .filter(item -> item.getProduct().getId().equals(targetProductId))
                        .map(ReceiptItem::getLineTotal)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            } else {
                // Aplicăm la tot bonul
                baseAmount = receipt.getTotalAmount();
            }
            
            BigDecimal calculated = baseAmount.multiply(val)
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            
            // Aplicăm capul maxim de discount din campanie (dacă există)
            BigDecimal maxCap = voucher.getCampaign().getMaxDiscountAmount();
            if (maxCap != null && calculated.compareTo(maxCap) > 0) {
                calculated = maxCap;
            }
            
            // Nu poate depăși totalul bonului
            return calculated.min(receipt.getTotalAmount());
        }

        // CAZ 3: Ore gratuite (FREE_HOURS)
        if ("FREE_HOURS".equals(type) && targetProductId != null) {
            // Căutăm produsul țintă pe bon (ex: Ora de joacă)
            return receipt.getItems().stream()
                    .filter(item -> item.getProduct().getId().equals(targetProductId))
                    .findFirst()
                    .map(item -> {
                        // Luăm minimul dintre ore gratuite din voucher și cantitate efectivă pe bon
                        BigDecimal itemQuantity = item.getQuantity() != null ? item.getQuantity() : val;
                        BigDecimal applicableHours = val.min(itemQuantity);
                        return item.getUnitPrice().multiply(applicableHours);
                    })
                    .orElse(BigDecimal.ZERO)
                    .min(receipt.getTotalAmount());
        }

        return BigDecimal.ZERO;
    }
    
 // Înlocuiește metodele de emitere cu această versiune curată:

    @Transactional
    public void checkAndIssueVouchers(Receipt receipt) {
        // Luăm campaniile care sunt active azi
        List<VoucherCampaign> activeCampaigns = campaignRepository.findAllActive(LocalDate.now());

        for (VoucherCampaign campaign : activeCampaigns) {
            if (isEligible(receipt, campaign)) {
                issueVoucher(receipt, campaign);
            }
        }
    }

    private void issueVoucher(Receipt receipt, VoucherCampaign campaign) {
        String code = generateUniqueCode(campaign.getPrefix(), campaign.getCodeLength());
        
        CustomerVoucher voucher = CustomerVoucher.builder()
                .code(code)
                .campaign(campaign)
                .discountType(campaign.getDiscountType())
                .discountValue(campaign.getDiscountValue())
            .expiresAt(LocalDate.now().plusDays(campaign.getValidDays()).atTime(23, 59, 59))
                .issuedReceipt(receipt)
                .used(false)
                .build();

        voucherRepository.save(voucher);
    }

    private boolean isEligible(Receipt receipt, VoucherCampaign campaign) {
        // 1. Suma minimă
        if (campaign.getMinAmount() != null && receipt.getTotalAmount().compareTo(campaign.getMinAmount()) < 0) {
            return false;
        }

        // 2. Produs obligatoriu pentru EMITERE (required_product_id)
        if (campaign.getRequiredProductId() != null) {
            boolean productPresent = receipt.getItems().stream()
                    .anyMatch(item -> item.getProduct() != null && 
                                     item.getProduct().getId().equals(campaign.getRequiredProductId()));
            if (!productPresent) return false;
        }

        // 3. Minim ore jucate
        if (campaign.getMinHoursPlayed() != null) {
            BigDecimal hoursPlayed = receipt.getItems().stream()
                    .filter(ReceiptItem::isServiceTime)
                    .map(ReceiptItem::getQuantity)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            
            if (hoursPlayed.compareTo(new BigDecimal(campaign.getMinHoursPlayed())) < 0) {
                return false;
            }
        }
        return true;
    }
    
    @Transactional
    public void cancelVoucherUsage(Integer receiptId) {
        // Căutăm dacă există un voucher marcat ca folosit pe acest bon
        voucherRepository.findByUsedReceiptId(receiptId).ifPresent(voucher -> {
            voucher.setUsed(false);
            voucher.setUsedReceipt(null);
            voucher.setUsedAt(null);
            voucherRepository.save(voucher);
        });
    }
    //Reactivare manuala voucher
    @Transactional
    public void reactivateVoucherByCode(String code) {
        // Căutăm direct după codul unic
        CustomerVoucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("ERROR.VOUCHER.NOT_FOUND"));

        if (!voucher.getUsed()) {
            throw new RuntimeException("ERROR.VOUCHER.ALREADY_ACTIVE");
        }

        voucher.setUsed(false);
        voucher.setUsedReceipt(null);
        voucher.setUsedAt(null);
        
        voucherRepository.save(voucher);
    }
}
import { client } from '../../../../shared/api/client';

export const SalesService = {
    
    /**
     * 1. RAPORT PROFIT
     * Returnează un BigDecimal (profitul net: Vânzări - Cost Achiziție - Vouchere).
     * Endpoint: /api/sales/receipts/reports/profit
     */
    getGrossProfit: async ({ start, end, warehouseId }) => {
        return await client('sales/receipts/reports/profit', {
            params: { start, end, warehouseId }
        });
    },

    /**
     * 2. RAPORT CANTITATIV (Top Vânzări)
     * Returnează o listă de produse cu cantitatea totală vândută și totalul încasat pe linie.
     * Endpoint: /api/sales/receipt-items/report/quantity
     */
    getQuantityReport: async ({ start, end, warehouseId, productIds }) => {
        return await client('sales/receipt-items/report/quantity', {
            params: { start, end, warehouseId, productIds }
        });
    },

    getProductTimeline: async ({ start, end, warehouseId, productId }) => {
        return await client('sales/receipt-items/report/timeline', {
            params: { start, end, warehouseId, productId }
        });
    },

    /**
     * 3. RAPORT ÎNCASĂRI (Sumar Plăți)
     * Returnează totalul încasărilor filtrat opțional după metoda de plată (CASH/CARD).
     * Endpoint: /api/sales/receipt-payments/report/sum
     */
    getPaymentsReport: async ({ start, end, warehouseId, methodCode }) => {
        return await client('sales/receipt-payments/report/sum', {
            params: { 
                start, 
                end, 
                warehouseId, 
                methodCode // Poate fi 'CASH', 'CARD' sau null (pentru toate)
            }
        });
    },

    /**
     * 4. ISTORIC BONURI (TABUL 1 - Lista Detaliată)
     * Returnează lista completă de bonuri (închise) pentru afișare tabelară.
     * Endpoint: /api/sales/receipts/report
     */
    getReceiptsHistory: async ({ start, end, warehouseId, status = 'CLOSED', paymentMethod } ) => {
        const params = { start, end, warehouseId, status };
        if (paymentMethod) params.paymentMethod = paymentMethod;
        return await client('sales/receipts/report', { params });
    },

    getReceiptsSummary: async ({ start, end, warehouseId, status = 'CLOSED' }) => {
        return await client('sales/receipts/report/summary', {
            params: { start, end, warehouseId, status }
        });
    },

    //5. CĂUTARE BON DUPĂ ID
    getReceiptById: async (id) => {
        return await client(`sales/receipts/${id}`);
    },

    //6. EDITARE BON ÎNCHIS (admin only)
    editReceipt: async (id, request) => {
        return await client(`sales/receipts/${id}/edit`, { body: request });
    }
};
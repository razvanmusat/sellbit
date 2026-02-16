import { client } from '../../../../shared/api/client';

const ENDPOINT = 'inventory/adjustments';

export const StockAdjustmentService = {

    /**
     * OPERAȚIONAL: Înregistrare Ajustare (Spargeri, Protocol, Corecții).
     * @param {Object} data - { productId, warehouseId, userId, reasonId, quantityChange, note }
     * quantityChange: Pozitiv (+) sau Negativ (-)
     */
    createAdjustment: async (data) => {
        return await client(ENDPOINT, { body: data });
    },

    //2. Raport Jurnal (Gestiune + Perioadă)
    getReportByDateRange: async (start, end, warehouseId) => {
        return await client(`${ENDPOINT}/report`, { 
            params: { start, end, warehouseId } 
        });
    },

    /**
     * AUDIT: Istoric ajustări pentru un produs.
     * @param {number} productId 
     */
    getByProduct: async (productId) => {
        return await client(`${ENDPOINT}/product/${productId}`);
    },   
};
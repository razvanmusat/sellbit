import { client } from '../../../../shared/api/client';

const ENDPOINT = 'inventory/stock-current';

export const StockCurrentService = {

    /**
     * RAPORT: Stoc scriptic per depozit.
     * @param {number} warehouseId 
     */
    getStockByWarehouse: async (warehouseId) => {
        return await client(`${ENDPOINT}/warehouse/${warehouseId}`);
    },

    /**
     * RAPORT: Stocul per depozit pe produs, cu preț de achiziție și preț de vânzare (fără TVA).
     * @param {number} warehouseId
     */
    getStockValueByWarehouse: async (warehouseId) => {
        return await client(`${ENDPOINT}/warehouse/${warehouseId}/value`);
    },

    /**
     * PRINT: Stoc per depozit filtrat — qty > 0 sau vândut cel puțin o dată.
     * @param {number} warehouseId
     */
    getStockByWarehouseForPrint: async (warehouseId) => {
        return await client(`${ENDPOINT}/warehouse/${warehouseId}/for-print`);
    },

    /**
     * POS/Live: Stoc live pentru un produs specific într-o gestiune.
     * @param {number} warehouseId 
     * @param {number} productId 
     */
    getProductStockLive: async (warehouseId, productId) => {
        return await client(`${ENDPOINT}/warehouse/${warehouseId}/product/${productId}`);
    },

    /**
     * OPERAȚIONAL: Setare stoc faptic (Inventar).
     * Suprascrie stocul scriptic cu cel numărat.
     * @param {Object} data - { warehouseId, reason, items: [{ productId, newQuantity }] }
     */
    setPhysicalStock: async (data) => {        
        return await client(`${ENDPOINT}/physical-stock`, { 
            method: 'POST',
            body: data 
        });
    }
};
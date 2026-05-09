import { client } from '../../../../shared/api/client';

const ENDPOINT = 'inventory/purchases';

export const PurchaseService = {
    
    /**
     * Recepție marfă bulk (mai multe linii de recepție).
     * @param {Object} data - { userId: Integer, items: Array<CreateItem> }
     * CreateItem: { productId, warehouseId, quantity, purchasePrice, expirationDate, note }
     */
    addBulkPurchase: async (data) => {
        return await client(`${ENDPOINT}/bulk`, { body: data });
    },    

    /**
     * AUDIT: Istoric loturi per produs (FIFO/Prețuri).
     * FIX CRITIC: Am adăugat warehouseId la parametri și în apelul client.
     */
    getByProduct: async (productId, warehouseId) => {        

        return await client(`${ENDPOINT}/product/${productId}`, {
            params: { warehouseId } 
        });
    },

    /**
     * RAPORT: Jurnal Achiziții (NIR-uri) într-un interval de timp.
     * @param {string} start - Data de început (YYYY-MM-DD)
     * @param {string} end - Data de sfârșit (YYYY-MM-DD)
     * @param {number} warehouseId - ID-ul gestiunii
     */
    getReportByDateRange: async (start, end, warehouseId) => {
        return await client(`${ENDPOINT}/report`, { 
            params: { start, end, warehouseId } 
        });
    },

    /**
     * Sterge o receptie intreaga (grup de purchase-uri). Esuaza daca orice lot a intrat in vanzari.
     * @param {number[]} ids - Lista de ID-uri purchase din grupul de sters
     */
    deleteGroup: async (ids) => {
        return await client(`${ENDPOINT}/group`, { method: 'DELETE', body: ids });
    },

    /**
     * ALERTĂ: Produse care expiră curând.
     * @param {number} days - Numărul de zile (default 15)
     */
    getExpirationAlerts: async (days = 15) => {
        return await client(`${ENDPOINT}/alerts/expiration`, { 
            params: { days } 
        });
    }
};
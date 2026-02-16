import { client } from '../../../../shared/api/client';

// Endpoint-ul de bază (fără /api, deoarece client.js îl adaugă automat)
const ENDPOINT = 'catering/catering-orders';

export const CateringService = {

    // --- OPERAȚIUNI STAFF (OPERATIONAL) ---

    /**
     * Creează o listă de comenzi noi.
     * @param {Array} orders - Lista de obiecte CreateOrderRequest
     * @returns {Promise<Array>} - Lista de comenzi create (OrderResponse)
     */
    createOrder: async (orders) => {
        return await client(ENDPOINT, {
            method: 'POST', // Explicit, deși client.js pune POST dacă are body
            body: orders
        });
    },

    /**
     * Returnează lista de produse disponibile pentru catering.
     * @returns {Promise<Array>} - Lista de ProductDTO
     */
    getAvailableProducts: async () => {
        return await client(`${ENDPOINT}/available-products`);
    },

    /**
     * Actualizează o comandă existentă.
     * @param {number} id - ID-ul comenzii
     * @param {Object} orderData - CreateOrderRequest
     * @returns {Promise<Object>} - Comanda actualizată (OrderResponse)
     */
    updateOrder: async (id, orderData) => {
        return await client(`${ENDPOINT}/${id}`, {
            method: 'PUT',
            body: orderData
        });
    },

    /**
     * Șterge (anulează) o comandă.
     * @param {number} id - ID-ul comenzii
     * @returns {Promise<void>}
     */
    deleteOrder: async (id) => {
        return await client(`${ENDPOINT}/${id}`, {
            method: 'DELETE'
        });
    },

    /**
     * Obține comenzile pentru o zi specifică.
     * @param {string} date - Data în format ISO (YYYY-MM-DD)
     * @returns {Promise<Array>} - Lista de OrderResponse
     */
    getDailyOrders: async (date) => {
        return await client(`${ENDPOINT}/daily`, {
            params: { date } // client.js va converti asta în ?date=YYYY-MM-DD
        });
    },

    // --- OPERAȚIUNI ADMIN (FINANCIAR) ---

    /**
     * Obține lista comenzilor neplătite într-un interval.
     * @param {string} start - Data de început (YYYY-MM-DD)
     * @param {string} end - Data de sfârșit (YYYY-MM-DD)
     * @returns {Promise<Array>} - Lista de OrderResponse
     */
    getUnpaidOrders: async (start, end) => {
        return await client(`${ENDPOINT}/unpaid`, {
            params: { start, end } // client.js va converti în ?start=...&end=...
        });
    },

    /**
     * Obține lista comenzilor PLĂTITE (Istoric).
     * @param {string} start - Data de început (YYYY-MM-DD)
     * @param {string} end - Data de sfârșit (YYYY-MM-DD)
     * @returns {Promise<Array>} - Lista de OrderResponse
     */
    getPaidHistory: async (start, end) => {
        return await client(`${ENDPOINT}/paid-history`, {
            params: { start, end }
        });
    },

    /**
     * Procesează plata pentru mai multe comenzi simultan.
     * @param {Object} bulkPayRequest - Obiectul BulkPayRequest { orderIds: [], paymentMethodId: ... }
     * @returns {Promise<void>}
     */
    processBulkPayment: async (bulkPayRequest) => {
        return await client(`${ENDPOINT}/bulk-pay`, {
            method: 'PATCH',
            body: bulkPayRequest
        });
    }
};


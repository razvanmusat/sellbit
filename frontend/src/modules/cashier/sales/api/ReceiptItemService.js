import { client } from '../../../../shared/api/client';

/**
 * Serviciu pentru operațiuni legate de liniile de pe bon (receipt items),
 * conform cu ReceiptItemController.java.
 */
export class ReceiptItemService {
  /**
   * Adaugă un produs nou pe un bon sau îi actualizează cantitatea dacă există deja.
   * Apelează POST /api/sales/receipt-items/sync
   *
   * @param {number} receiptId - ID-ul bonului.
   * @param {number} productId - ID-ul produsului.
   * @param {number | string} quantity - Cantitatea de adăugat/setat.
   * @returns {Promise<object>} - Răspunsul API, care conține bonul actualizat.
   */
  static async addOrUpdateItem(receiptId, productId, quantity) {    
    const params = new URLSearchParams({
      receiptId,
      productId,
      quantity,
    });

    // Apelăm clientul cu metoda 'POST' explicită și endpoint-ul complet.
    return client(`sales/receipt-items/sync?${params.toString()}`, {
      method: 'POST',
    });
  }

  /**
   * Șterge un produs de pe bon folosind ID-ul liniei de bon.
   * Apelează DELETE /api/sales/receipt-items/{itemId}
   *
   * @param {number} receiptItemId - ID-ul liniei de bon de șters.
   * @returns {Promise<object>} - Răspunsul API, care conține bonul actualizat.
   */
  static async removeItem(receiptItemId) {
    return client(`sales/receipt-items/${receiptItemId}`, { method: 'DELETE' });
  }

  /**
   * Obține toate liniile de bon pentru un anumit bon.
   * Apelează GET /api/sales/receipt-items/receipt/{receiptId}
   *
   * @param {number} receiptId - ID-ul bonului.
   * @returns {Promise<Array<object>>} - O listă cu produsele de pe bon.
   */
  static async getItemsByReceipt(receiptId) {
    return client(`sales/receipt-items/receipt/${receiptId}`);
  }

  /**
   * Generează un raport cantitativ al produselor vândute într-un interval.
   * Apelează GET /api/sales/receipt-items/report/quantity
   *
   * @param {string} start - Data de început în format ISO (ex: '2023-10-27T10:00:00').
   * @param {string} end - Data de sfârșit în format ISO.
   * @param {Array<number>} [productIds] - O listă opțională de ID-uri de produse.
   * @returns {Promise<Array<object>>} - Lista pentru raport.
   */
  static async getProductsQuantityReport(start, end, productIds) {
    const params = new URLSearchParams({ start, end });
    if (productIds && productIds.length > 0) {
      productIds.forEach(id => params.append('productIds', id));
    }
    return client(`sales/receipt-items/report/quantity?${params.toString()}`);
  }
}
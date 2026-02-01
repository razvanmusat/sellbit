import { client } from '../../../../shared/api/client';

export class StockCurrentService {
  
  /**
   * Obține stocul live pentru un produs într-o anumită gestiune.
   * Endpoint dedicat POS pentru verificare rapidă.
   * * @param {number} warehouseId - ID-ul gestiunii (din bonul curent).
   * @param {number} productId - ID-ul produsului căutat.
   * @returns {Promise<number>} Cantitatea disponibilă (ex: 15.00).
   */
  static async getProductStockLive(warehouseId, productId) {
    const endpoint = `inventory/stock-current/warehouse/${warehouseId}/product/${productId}`;
    return await client(endpoint);
  }
}
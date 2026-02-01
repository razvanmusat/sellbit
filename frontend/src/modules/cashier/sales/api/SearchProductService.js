import { client } from '../../../../shared/api/client';

export class SearchProductService {
  /**
   * Caută produse active după o denumire parțială.
   * @param {string} query - Termenul de căutare.
   * @returns {Promise<Array>} O listă de produse care se potrivesc.
   */
  static async searchProductsByName(query) {
    const endpoint = `catalog/products/pos/search?query=${encodeURIComponent(query)}`;
    return await client(endpoint);
  }

  /**
   * Obține un produs activ pe baza codului de bare exact.
   * @param {string} barcode - Codul de bare scanat.
   * @returns {Promise<object>} Produsul găsit sau o eroare dacă nu există.
   */
  static async getProductByBarcode(barcode) {
    const endpoint = `catalog/products/pos/barcode/${barcode}`;
    return await client(endpoint);
  }

  /**
   * Obține categoriile active pentru navigare.
   * Dacă `parentId` este null, returnează categoriile rădăcină.
   * @param {number|null} parentId - ID-ul categoriei părinte.
   * @returns {Promise<Array>} O listă de categorii.
   */
  static async getActiveCategories(parentId = null) {
    const endpoint = parentId ? `catalog/categories?parentId=${parentId}` : 'catalog/categories';
    return await client(endpoint);
  }

  /**
   * Obține produsele active dintr-o anumită categorie.
   * @param {number} categoryId - ID-ul categoriei.
   * @returns {Promise<Array>} O listă de produse din categoria respectivă.
   */
  static async getProductsForCategory(categoryId) {
    const endpoint = `catalog/products/pos?categoryId=${categoryId}`;
    return await client(endpoint);
  }
}
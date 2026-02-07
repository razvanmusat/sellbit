import { client } from '../../../../shared/api/client';

export class SearchProductService {
  
  /**
   * Caută produse active după o denumire parțială (POS).
   */
  static async searchProductsByName(query) {
    return await client('catalog/products/pos/search', {
        params: { query }
    });
  }

  /**
   * Obține un produs activ pe baza codului de bare.
   */
  static async getProductByBarcode(barcode) {
    return await client(`catalog/products/pos/barcode/${barcode}`);
  }

  /**
   * Obține categoriile active pentru navigare.
   */
  static async getActiveCategories(parentId = null) {
    return await client('catalog/categories', {
        params: { parentId }
    });
  }

  /**
   * Obține produsele dintr-o categorie.
   * Dacă isAdmin = true, apelează endpoint-ul de admin (vede și inactive).
   * Altfel, apelează endpoint-ul de POS (doar active).
   */
  static async getProductsByCategory(categoryId, isAdmin = false) {
    const endpoint = isAdmin ? 'catalog/products/admin' : 'catalog/products/pos';
    return await client(endpoint, {
        params: { categoryId }
    });
  }
}
import { client } from '../../../../shared/api/client';

const BASE_URL = 'catering/catering-orders';

export class CateringService {

  /**
   * 1. Obține lista de produse disponibile pentru Catering.
   * Auth: 50, 100
   * Endpoint: GET /api/catering/catering-orders/available-products
   */
  static async getAvailableProducts() {
    return await client(`${BASE_URL}/available-products`);
  }

  /**
   * 2. Obține comenzile de catering pentru o zi specifică.
   * Auth: 50, 100
   * Endpoint: GET /api/catering/catering-orders/daily?date=YYYY-MM-DD
   */
  static async getDailyOrders(date) {
    return await client(`${BASE_URL}/daily?date=${date}`);
  }

  /**
   * 3. Crează o comandă nouă de catering.
   * Auth: 50, 100
   * Endpoint: POST /api/catering/catering-orders
   */
  static async create(orderData) {
    return await client(BASE_URL, {
      method: 'POST',
      body: orderData
    });
  }

  /**
   * 4. Actualizează o comandă existentă.
   * Auth: 50, 100
   * Endpoint: PUT /api/catering/catering-orders/{id}
   */
  static async update(id, orderData) {
    return await client(`${BASE_URL}/${id}`, {
      method: 'PUT',
      body: orderData
    });
  }

  /**
   * 5. Șterge (anulează) o comandă.
   * Auth: 50, 100
   * Endpoint: DELETE /api/catering/catering-orders/{id}
   */
  static async delete(id) {
    return await client(`${BASE_URL}/${id}`, {
      method: 'DELETE'
    });
  }
}
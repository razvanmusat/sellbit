import { client } from '../../../../shared/api/client';

/**
 * Serviciu pentru operațiuni legate de gestiuni (warehouses).
 */
export class WarehouseService {
  /**
   * Obține lista de gestiuni active.
   * Corespunde cu @GetMapping("/active") din WarehouseController.
   * @returns {Promise<Array>} O promisiune care rezolvă cu lista de gestiuni active.
   */
  static async getActiveWarehouses() {
    const response = await client('warehouses/active');
    return response;
  }
}
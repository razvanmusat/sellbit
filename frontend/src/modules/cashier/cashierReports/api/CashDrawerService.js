import { client } from '../../../../shared/api/client';

export class CashDrawerService {
  /**
   * Obține soldul live pentru o anumită gestiune.
   * Se leagă la: GET /api/cash/drawer/warehouse/{warehouseId}
   */
  static async getBalance(warehouseId) {
    // Atenție la path: 'cash/drawer/warehouse/' exact ca in Java
    const response = await client(`cash/drawer/warehouse/${warehouseId}`);
    return response; 
  }
}
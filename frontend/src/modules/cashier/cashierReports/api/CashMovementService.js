import { client } from '../../../../shared/api/client';

export class CashMovementService {

  /**
   * Obține lista de tipuri de mișcări active (pentru dropdown).
   * Endpoint: GET /api/lookup/cash-movement-types/active
   */
  static async getActiveTypes() {
    const response = await client('lookup/cash-movement-types/active');
    return response;
  }

  /**
   * Înregistrează o mișcare manuală de numerar.
   * Endpoint: POST /api/cash/movements
   */
  static async createMovement({ warehouseId, typeCode, amount, userId, note }) {
    const queryParams = new URLSearchParams({
      warehouseId,
      typeCode,
      amount,
      userId
    });

    if (note) {
      queryParams.append('note', note);
    }

    return await client(`cash/movements?${queryParams.toString()}`, {
      method: 'POST'
    });
  }

  /**
   * Obține istoricul mișcărilor filtrat pe perioadă.
   * Endpoint: GET /api/cash/movements/warehouse/{warehouseId}?from=YYYY-MM-DD&to=YYYY-MM-DD
   * * @param {number} warehouseId 
   * @param {string} [fromDate] - Data start (ex: '2024-01-01'). Dacă e null, backend-ul pune default.
   * @param {string} [toDate] - Data final (ex: '2024-01-31').
   */
  static async getHistory(warehouseId, fromDate, toDate) {
    const params = new URLSearchParams();
    
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await client(`cash/movements/warehouse/${warehouseId}${queryString}`);
    return response;
  }
}
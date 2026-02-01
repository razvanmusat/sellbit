import { client } from '../../../../shared/api/client';

export class StockAdjustmentService {

  /**
   * @PreAuthorize("hasAnyAuthority('50', '100')")
   * POST /api/inventory/adjustments
   * OPERAȚIONAL: Înregistrează o ajustare (Spargeri, Protocol, etc.)
   * @param {Object} request - { warehouseId, productId, quantity, reasonId, note }
   */
  static async createAdjustment(request) {
    await client('inventory/adjustments', { body: request });
  }

  /**
   * @PreAuthorize("hasAnyAuthority('50', '100')")
   * GET /api/lookup/adjustment-reasons/active
   * LISTĂ: Returnează motivele active, FILTRATE pentru Casier.
   * Excludem 'INVENTORY_COUNT' pentru că doar Adminul face inventar total.
   */
  static async getActiveReasons() {
    const response = await client('lookup/adjustment-reasons/active');
    
    // --- FILTRARE FRONTEND ---
    // Păstrăm doar motivele operaționale (DAMAGED, EXPIRED, PROTOCOL, etc.)
    // Eliminăm motivul de sistem 'INVENTORY_COUNT'.
    if (Array.isArray(response)) {
        return response.filter(reason => reason.code !== 'INVENTORY_COUNT');
    }
    
    return response;
  }
}
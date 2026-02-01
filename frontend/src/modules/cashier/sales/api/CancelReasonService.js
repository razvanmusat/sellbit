import { client } from '../../../../shared/api/client';

export class CancelReasonService {
  /**
   * Obține lista motivelor de anulare active.
   */
  static async getActiveReasons() {
    return await client('lookup/cancel-reasons/active');
  }

  /**
   * Anulează un bon deschis.
   * @param {number} receiptId - ID-ul bonului.
   * @param {number} reasonId - ID-ul motivului selectat.
   */
  static async cancelReceipt(receiptId, reasonId) {
    // PATCH /api/sales/receipts/{id}/cancel?reasonId=...
    return await client(`sales/receipts/${receiptId}/cancel?reasonId=${reasonId}`, {
      method: 'PATCH',
    });
  }
}
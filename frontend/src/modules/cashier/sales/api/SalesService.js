import { client } from '../../../../shared/api/client';

export class SalesService {

  // @PostMapping
  // POS: Deschide o masă nouă (sau un bon nou).
  static async createReceipt(request) {
    const response = await client('sales/receipts', { body: request });
    return response;
  }

  // @GetMapping("/active")
  // POS: Obține bonurile deschise pentru o gestiune.
  static async getActiveReceipts(warehouseId) {
    const response = await client(`sales/receipts/active?warehouseId=${warehouseId}`);
    return response;
  }

  // @GetMapping("/alerts")
  // ALERTE: Bonuri uitate deschise de ieri. (Are auth '50')
  static async getUnclosedAlerts() {
    const response = await client('sales/receipts/alerts');
    return response;
  }

  // @PatchMapping("/{id}/cancel")
  // POS: Anulează bonul deschis.
  static async cancelOpenReceipt(id, reasonId) {
    const response = await client(`sales/receipts/${id}/cancel?reasonId=${reasonId}`, {
      method: 'PATCH'
    });
    return response;
  }

  // @PostMapping("/{id}/close")
  // POS: Închidere Bon (Plată).
  static async closeReceipt(id) {
    await client(`sales/receipts/${id}/close`, { method: 'POST' });
  }

  // @PostMapping("/{id}/refund")
  // POS: Refundare parțială.
  static async createPartialRefund(id, request) {
    const response = await client(`sales/receipts/${id}/refund`, { body: request });
    return response;
  }

  // @GetMapping("/{id}/print-bill-note")
  // POS: Date pentru printare Nota de plată.
  static async getBillNoteData(id) {
    const response = await client(`sales/receipts/${id}/print-bill-note`);
    return response;
  }

  // @PostMapping("/advance")
  // POS: Încasare Avans.
  static async registerAdvancePayment(request) {
    await client('sales/receipts/advance', { body: request });
  }
}
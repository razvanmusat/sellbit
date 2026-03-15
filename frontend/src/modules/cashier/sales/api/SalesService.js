import { client } from '../../../../shared/api/client';
import { emitSalesDataChanged } from '../../../../shared/utils/salesSyncEvents';

export class SalesService {

  static async createReceipt(request) {
    return await client('sales/receipts', { body: request });
  }

  // Fără warehouseId — backend returnează toate bonurile OPEN
  static async getActiveReceipts() {
    return await client('sales/receipts/active');
  }

  static async getUnclosedAlerts() {
    return await client('sales/receipts/alerts');
  }

  static async cancelOpenReceipt(id, reasonId) {
    const response = await client(`sales/receipts/${id}/cancel?reasonId=${reasonId}`, {
      method: 'PATCH'
    });
    emitSalesDataChanged({ type: 'receipt-cancelled' });
    return response;
  }

  static async closeReceipt(id) {
    await client(`sales/receipts/${id}/close`, { method: 'POST' });
    emitSalesDataChanged({ type: 'receipt-closed' });
  }

  static async createPartialRefund(id, request) {
    const response = await client(`sales/receipts/${id}/refund`, { body: request });
    emitSalesDataChanged({ type: 'receipt-refunded' });
    return response;
  }

  static async getBillNoteData(id) {
    return await client(`sales/receipts/${id}/print-bill-note`);
  }

  static async registerAdvancePayment(request) {
    await client('sales/receipts/advance', { body: request });
    emitSalesDataChanged({ type: 'advance-registered', warehouseId: request?.warehouseId ?? null });
  }

  static async getReceiptsReport(warehouseId, status, start, end) {
    return await client(
      `sales/receipts/report?warehouseId=${warehouseId}&status=${status}&start=${start}&end=${end}`
    );
  }

  static async getReceiptsReportSummary(warehouseId, status, start, end) {
    return await client(
      `sales/receipts/report/summary?warehouseId=${warehouseId}&status=${status}&start=${start}&end=${end}`
    );
  }

  static async getReceiptById(id) {
    return await client(`sales/receipts/${id}`);
  }

  static async getGrossProfitReport(warehouseId, start, end) {
    return await client(
      `sales/receipts/reports/profit?warehouseId=${warehouseId}&start=${start}&end=${end}`
    );
  }
}
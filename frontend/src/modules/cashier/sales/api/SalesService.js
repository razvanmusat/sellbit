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

  static async closeReceipt(id, skipFiscal = false) {
    const url = skipFiscal ? `sales/receipts/${id}/close?skipFiscal=true` : `sales/receipts/${id}/close`;
    const result = await client(url, { method: 'POST' });
    emitSalesDataChanged({ type: 'receipt-closed' });
    return result;
  }

  // Verificare pasivă pentru un bon FISCAL_PENDING, fără POST nou către Fisco
  static async checkFiscalPending(id) {
    return await client(`sales/receipts/${id}/fiscal/check`);
  }

  static async createPartialRefund(id, request) {
    const response = await client(`sales/receipts/${id}/refund`, { body: request });
    emitSalesDataChanged({ type: 'receipt-refunded' });
    return response;
  }

  static async getBillNoteData(id) {
    return await client(`sales/receipts/${id}/print-bill-note`);
  }

  static async registerAdvancePayment(request, skipFiscal = false) {
    const url = skipFiscal ? 'sales/receipts/advance?skipFiscal=true' : 'sales/receipts/advance';
    await client(url, { body: request });
    emitSalesDataChanged({ type: 'advance-registered', warehouseId: request?.warehouseId ?? null });
  }

  static async registerGiftCard(request, skipFiscal = false) {
    const url = skipFiscal ? 'sales/receipts/gift-card?skipFiscal=true' : 'sales/receipts/gift-card';
    const result = await client(url, { body: request });
    emitSalesDataChanged({ type: 'gift-card-sold', warehouseId: request?.warehouseId ?? null });
    return result;
  }

  // Reconstruiește dialogul de vouchere pentru un bon închis prin reconciliere fiscală
  static async getVoucherIssuance(receiptId) {
    return await client(`voucher/customer-vouchers/issuance/${receiptId}`);
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

  static async editReceipt(id, request) {
    return await client(`sales/receipts/${id}/edit`, { body: request });
  }
}

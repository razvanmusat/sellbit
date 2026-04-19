import { client } from '../../../../shared/api/client';

export class PaymentService {

  static async getActivePaymentMethods() {
    return await client('lookup/payment-methods/active');
  }

  // warehouseId — gestiunea pe care merge cash-ul (null pentru VOUCHER)
  static async addPayment(receiptId, paymentMethodId, amount, userId, warehouseId) {
    const params = new URLSearchParams({ receiptId, paymentMethodId, amount, userId });
    if (warehouseId != null) params.append('warehouseId', warehouseId);
    return await client(`sales/receipt-payments?${params.toString()}`, { method: 'POST' });
  }

  /**
   * Preview voucher — returnează suma calculată fără a consuma voucherul.
   * Folosit pentru a afișa distribuția per gestiune înainte de confirmare.
   */
  static async previewVoucher(receiptId, voucherCode) {
    const params = new URLSearchParams({ receiptId, voucherCode });
    return await client(`sales/receipt-payments/voucher-preview?${params.toString()}`);
  }

  /**
   * Aplică un voucher pe bon.
   * distributions — lista [{warehouseId, amount}] per gestiune.
   * Dacă null → plată unică fără gestiune.
   */
  static async applyVoucher(receiptId, voucherCode, userId, distributions = null) {
    const params = new URLSearchParams({ receiptId, voucherCode, userId });
    return await client(`sales/receipt-payments/apply-voucher?${params.toString()}`, {
      method: 'POST',
      body: distributions ? { distributions } : undefined,
    });
  }

  static async removePayment(paymentId, userId) {
    return await client(`sales/receipt-payments/${paymentId}?userId=${userId}`, {
      method: 'DELETE',
    });
  }

  static async getPaymentsByReceipt(receiptId) {
    if (PaymentService._editModePayments !== null) {
      return PaymentService._editModePayments;
    }
    return await client(`sales/receipt-payments/receipt/${receiptId}`);
  }

  // Edit mode override — set by EditReceiptPage to intercept payment fetches
  static _editModePayments = null;

  static setEditModePayments(payments) {
    PaymentService._editModePayments = payments;
  }

  static clearEditModePayments() {
    PaymentService._editModePayments = null;
  }
}
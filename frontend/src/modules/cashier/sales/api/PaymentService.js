import { client } from '../../../../shared/api/client';

export class PaymentService {
  static async getActivePaymentMethods() {
    return await client('lookup/payment-methods/active');
  }

  static async addPayment(receiptId, paymentMethodId, amount, userId) {
    return await client(`sales/receipt-payments?receiptId=${receiptId}&paymentMethodId=${paymentMethodId}&amount=${amount}&userId=${userId}`, {
      method: 'POST',
    });
  }

  static async applyVoucher(receiptId, voucherCode, userId) {
    return await client(`sales/receipt-payments/apply-voucher?receiptId=${receiptId}&voucherCode=${voucherCode}&userId=${userId}`, {
      method: 'POST',
    });
  }

  static async removePayment(paymentId, userId) {
    return await client(`sales/receipt-payments/${paymentId}?userId=${userId}`, {
      method: 'DELETE',
    });
  }

  static async getPaymentsByReceipt(receiptId) {
      return await client(`sales/receipt-payments/receipt/${receiptId}`);
  }
}
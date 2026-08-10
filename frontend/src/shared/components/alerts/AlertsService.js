import { client } from '../../api/client';

export const AlertsService = {
  // Alerte de bonuri neinchise (din ieri)
  getUnclosedAlerts: async () => {
    return client('sales/receipts/alerts');
  },

  // Alerte de produse care expiră (default 15 zile)
  getExpirationAlerts: async (days = 15) => {
    return client('inventory/purchases/alerts/expiration', {
      params: { days },
    });
  },

  updateExpirationDate: async (purchaseId, date) => {
    return client(`inventory/purchases/${purchaseId}/expiration`, {
      method: 'PATCH',
      params: { date },
    });
  },

  // Deservă bonul neinchis
  closeReceipt: async (receiptId) => {
    return client(`sales/receipts/${receiptId}/close`, {
      method: 'PUT',
    });
  },

  // Anulează bonul neinchis
  cancelReceipt: async (receiptId) => {
    return client(`sales/receipts/${receiptId}/cancel`, {
      method: 'PUT',
    });
  },
};

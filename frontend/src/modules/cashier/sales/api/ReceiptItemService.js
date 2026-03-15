import { client } from '../../../../shared/api/client';

export class ReceiptItemService {

  // warehouseId — gestiunea liniei, selectată per produs
  static async addOrUpdateItem(receiptId, productId, quantity, warehouseId) {
    const params = new URLSearchParams({
      receiptId,
      productId,
      quantity,
      warehouseId,
    });
    return client(`sales/receipt-items/sync?${params.toString()}`, {
      method: 'POST',
    });
  }

  static async removeItem(receiptItemId) {
    return client(`sales/receipt-items/${receiptItemId}`, { method: 'DELETE' });
  }

  static async getItemsByReceipt(receiptId) {
    return client(`sales/receipt-items/receipt/${receiptId}`);
  }

  // warehouseId opțional — filtru pe gestiune
  static async getProductsQuantityReport(start, end, productIds, warehouseId) {
    const params = new URLSearchParams({ start, end });
    if (warehouseId != null) {
      params.append('warehouseId', warehouseId);
    }
    if (productIds && productIds.length > 0) {
      productIds.forEach(id => params.append('productIds', id));
    }
    return client(`sales/receipt-items/report/quantity?${params.toString()}`);
  }

  static async getProductTimeline(start, end, productId, warehouseId) {
    const params = new URLSearchParams({ start, end, productId });
    if (warehouseId != null) {
      params.append('warehouseId', warehouseId);
    }
    return client(`sales/receipt-items/report/timeline?${params.toString()}`);
  }
}
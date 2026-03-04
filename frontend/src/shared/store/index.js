import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../modules/auth/state/authSlice';
import sellPageReducer from '../../modules/cashier/sales/state/sellPageSlice';
import cashierReducer from '../../modules/cashier/cashierReports/store/cashierSlice'; 
import sellReportsReducer from '../../modules/cashier/cashierReports/store/sellReportsSlice';
import cashMovementHistoryReducer from '../../modules/cashier/cashierReports/store/cashMovementHistorySlice';
import reservationsReducer from '../../modules/cashier/reservations/store/reservationsSlice';
import cateringCalendarReducer from '../../modules/cashier/catering/store/calendarSlice';
import cateringReducer from '../../modules/admin/catering/store/cateringSlice';
import catalogReducer from '../../modules/admin/catalog/store/catalogSlice';
import globalCatalogReducer from './globalCatalogSlice';
import purchasePageReducer from '../../modules/admin/inventory/store/purchasePageSlice';
import adjustmentPageReducer from '../../modules/admin/inventory/store/adjustmentPageSlice';
import productStatsReducer from '../../modules/admin/sales/store/productStatsSlice';
import receiptsReducer from '../../modules/admin/sales/store/receiptsSlice';
import paymentsReducer from '../../modules/admin/sales/store/paymentsSlice';
import usersReducer from '../../modules/admin/settings/users/store/usersSlice';
import customerVouchersReducer from '../../modules/admin/vouchers/store/customerVouchersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sellPage: sellPageReducer,    
    cashier: cashierReducer,
    sellReports: sellReportsReducer,
    cashMovementHistory: cashMovementHistoryReducer,
    reservations: reservationsReducer,
    cateringCalendar: cateringCalendarReducer,
    catering: cateringReducer,
    catalog: catalogReducer,  
    globalCatalog: globalCatalogReducer,
    purchasePage: purchasePageReducer,
    adjustmentPage: adjustmentPageReducer,
    productStats: productStatsReducer,
    receipts: receiptsReducer,
    payments: paymentsReducer,
    users: usersReducer,
    customerVouchers: customerVouchersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
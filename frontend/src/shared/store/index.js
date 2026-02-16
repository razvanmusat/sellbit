import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../modules/auth/state/authSlice';
import sellPageReducer from '../../modules/cashier/sales/state/sellPageSlice';
import cashierReducer from '../../modules/cashier/cashierReports/store/cashierSlice'; 
import reservationsReducer from '../../modules/cashier/reservations/store/reservationsSlice';
import cateringCalendarReducer from '../../modules/cashier/catering/store/calendarSlice';
import cateringReducer from '../../modules/admin/catering/store/cateringSlice';
import catalogReducer from '../../modules/admin/catalog/store/catalogSlice';
import globalCatalogReducer from './globalCatalogSlice';
import purchasePageReducer from '../../modules/admin/inventory/store/purchasePageSlice';
import adjustmentPageReducer from '../../modules/admin/inventory/store/adjustmentPageSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sellPage: sellPageReducer,    
    cashier: cashierReducer, 
    reservations: reservationsReducer,
    cateringCalendar: cateringCalendarReducer,
    catering: cateringReducer,
    catalog: catalogReducer,  
    globalCatalog: globalCatalogReducer,
    purchasePage: purchasePageReducer,
    adjustmentPage: adjustmentPageReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
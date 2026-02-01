import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../modules/auth/state/authSlice';
import sellPageReducer from '../../modules/cashier/sales/state/sellPageSlice';
import cashierReducer from '../../modules/cashier/cashierReports/store/cashierSlice'; 
import reservationsReducer from '../../modules/cashier/reservations/store/reservationsSlice';
import cateringCalendarReducer from '../../modules/cashier/catering/store/calendarSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sellPage: sellPageReducer,    
    cashier: cashierReducer, 
    reservations: reservationsReducer,
    cateringCalendar: cateringCalendarReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
import { createSlice } from '@reduxjs/toolkit';
import dayjs from 'dayjs';

const initialState = {
  selectedDate: dayjs().format('YYYY-MM-DD'),
  dailyOrders: [],      
  ordersDate: null,      
};

export const calendarSlice = createSlice({
  name: 'cateringCalendar',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    
    setDailyOrders: (state, action) => {
        state.dailyOrders = action.payload.orders;
        state.ordersDate = action.payload.date;
    },

    invalidateDailyOrders: (state) => {
        state.dailyOrders = [];
        state.ordersDate = null;
    }
  },
});

export const { setSelectedDate, setDailyOrders, invalidateDailyOrders } = calendarSlice.actions;
export const selectSelectedDate = (state) => state.cateringCalendar.selectedDate;
export const selectDailyOrders = (state) => state.cateringCalendar.dailyOrders; // <--- Selector nou
export const selectOrdersDate = (state) => state.cateringCalendar.ordersDate;   // <--- Selector nou

export default calendarSlice.reducer;
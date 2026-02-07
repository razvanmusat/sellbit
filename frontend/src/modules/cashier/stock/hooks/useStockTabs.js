import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { fetchCashierWarehouses } from '../../cashierReports/store/cashierSlice';

export const useStockTabs = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. Citim parametrii din URL
  const currentTab = searchParams.get('tab');
  const currentWarehouseParam = searchParams.get('warehouseId');

  // --- REDUX ---
  const { warehouses, loading } = useSelector((state) => state.cashier);

  // --- LOCAL STATE ---
  const [activeTab, setActiveTab] = useState(currentTab || false);
  
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    currentWarehouseParam ? Number(currentWarehouseParam) : false
  );

  // --- FETCH DATA ---
  useEffect(() => {
    dispatch(fetchCashierWarehouses());
  }, [dispatch]);

  // --- URL SYNC ---
  useEffect(() => {
    if (currentTab) {
      setActiveTab(currentTab);
    } else {
      setActiveTab(false);
    }

    if (currentWarehouseParam) {
      setSelectedWarehouseId(Number(currentWarehouseParam));
    }
  }, [currentTab, currentWarehouseParam]);


  // --- HANDLERS ---

  const handleWarehouseChange = (event, newValue) => {
    setSelectedWarehouseId(newValue);

    // FIX: Păstrăm parametrii existenți (inclusiv categoryId) și modificăm DOAR warehouseId
    const newParams = new URLSearchParams(searchParams);
    
    if (newValue) {
        newParams.set('warehouseId', newValue);
    } else {
        newParams.delete('warehouseId');
    }

    // Dacă nu avem tab setat, punem unul default, ca să nu crape navigarea
    if (!newParams.get('tab') && activeTab) {
        newParams.set('tab', activeTab);
    }
    
    setSearchParams(newParams);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);

    // FIX: La schimbarea tab-ului, păstrăm gestiunea, dar poate vrei să resetezi categoria?
    // De obicei când schimbi tab-ul major (ex: din Search în Catalog), vrei să rămâi pe gestiune.
    const newParams = new URLSearchParams(searchParams);
    
    if (newValue) {
        newParams.set('tab', newValue);
    } else {
        newParams.delete('tab');
    }

    // Opțional: Dacă vrei ca atunci când schimbi TAB-ul să te scoată la rădăcină,
    // decomentează linia de mai jos. Dacă vrei să rămâi în categoria Ape și când dai click pe tab-ul Catalog iar, las-o așa.
    // newParams.delete('categoryId'); 

    setSearchParams(newParams);
  };

  return {
    warehouses,
    loading,
    activeTab,
    selectedWarehouseId,
    handleWarehouseChange,
    handleTabChange
  };
};
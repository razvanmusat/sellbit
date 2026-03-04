import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { CashMovementService } from '../api/CashMovementService';
import { CashDrawerService } from '../api/CashDrawerService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useCashDrawer = (warehouseId) => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();

    // FIX 1: Pornim cu loading TRUE ca să nu afișeze "0.00" înainte de verificare
    const [loading, setLoading] = useState(true);
    
    const [movementTypes, setMovementTypes] = useState([]);
    const [currentBalance, setCurrentBalance] = useState(0); 

    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ typeCode: '', amount: '', note: '' });

    const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        if (warehouseId) {
            // Când se schimbă ID-ul, punem loading true imediat pentru a ascunde datele vechi
            setLoading(true); 
            loadData();
            setShowForm(false);
        }
    }, [warehouseId]);

    const loadData = async () => {
        // setLoading(true); // Nu mai e strict necesar aici, e pus mai sus, dar nu strică
        try {
            const [typesList, balanceData] = await Promise.all([
                CashMovementService.getActiveTypes(),
                CashDrawerService.getBalance(warehouseId)
            ]);

            const allowedManualCodes = ['BANK_DEPOSIT', 'PAYMENT_SUPPLIER', 'CASH_IN', 'CASH_OUT'];
            setMovementTypes((typesList || []).filter(t => allowedManualCodes.includes(t.code)));
            
            setCurrentBalance(balanceData); 

        } catch (error) {
            console.error("Eroare incarcare date sertar:", error);
            showToast("Nu s-a putut încărca soldul.", "error");
        } finally {
            setLoading(false); // Abia acum afișăm conținutul
        }
    };

    // ... restul funcțiilor (showToast, handleSubmit etc) rămân identice ...
    const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
    const handleCloseToast = (event, reason) => {
        if (reason === 'clickaway') return;
        setToast((prev) => ({ ...prev, open: false }));
    };
    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const handleOpenForm = () => setShowForm(true);
    const handleCloseForm = () => setShowForm(false);

    const handleSubmit = async () => {
        const { typeCode, amount, note } = formData;
        const amountVal = parseFloat(amount);

        if (!typeCode) { showToast('Alege tipul operațiunii.', 'warning'); return; }
        if (!amountVal || amountVal <= 0) { showToast('Sumă invalidă.', 'warning'); return; }

        setSubmitting(true);
        try {

            await CashMovementService.createMovement({
                warehouseId,
                typeCode,
                amount: amountVal,
                userId: user?.id,
                note
            });

            // Șterge tot cache-ul și refetch pentru perioada activă (toate filtrele)
            dispatch({ type: 'cashMovementHistory/resetCache' });
            // Refă fetch pentru perioada activă din URL (dacă există)
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const urlStart = urlParams.get('startDate');
                const urlEnd = urlParams.get('endDate');
                const urlType = urlParams.get('type') || '';
                if (urlStart && urlEnd) {
                    dispatch(require('../store/cashMovementHistorySlice').fetchCashMovementHistory({
                        warehouseId,
                        startDate: urlStart,
                        endDate: urlEnd,
                        type: urlType
                    }));
                } else {
                    // fallback: ziua curentă
                    const today = new Date();
                    const startDate = today.toISOString().slice(0, 10);
                    const endDate = startDate;
                    dispatch(require('../store/cashMovementHistorySlice').fetchCashMovementHistory({
                        warehouseId,
                        startDate,
                        endDate,
                        type: ''
                    }));
                }
            } catch {}

            const newBalance = await CashDrawerService.getBalance(warehouseId);
            setCurrentBalance(newBalance);

            showToast('Operațiune reușită!', 'success');
            setShowForm(false);
            setFormData({ typeCode: '', amount: '', note: '' });

        } catch (err) {
            const msg = getFriendlyErrorMessage(err);
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return {
        loading,
        movementTypes,
        currentBalance,
        showForm,
        formData,
        submitting,
        toast,
        handleCloseToast,
        handleOpenForm,
        handleCloseForm,
        handleInputChange,
        handleSubmit
    };
};
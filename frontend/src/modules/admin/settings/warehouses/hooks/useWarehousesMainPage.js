import { useState, useEffect } from 'react';
import { WarehouseService } from '../api/WarehouseService';
import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';

export const useWarehousesMainPage = () => {
    // --- STATE ---
    const [activeWarehouses, setActiveWarehouses] = useState([]);
    const [inactiveWarehouses, setInactiveWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // UI State: Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null); 
    
    // UI State: Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // UI State: Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState({ 
        open: false, 
        warehouse: null,
        type: 'DEACTIVATE'
    });

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const [activeData, inactiveData] = await Promise.all([
                WarehouseService.getAllActive(),
                WarehouseService.getAllInactive()
            ]);
            setActiveWarehouses(activeData || []);
            setInactiveWarehouses(inactiveData || []);
        } catch (error) {
            showSnackbar(getFriendlyErrorMessage(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- HANDLERS: SNACKBAR ---
    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // --- HANDLERS: MODAL (CREATE/EDIT) ---
    const handleOpenCreate = () => {
        setEditItem(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (warehouse) => {
        setEditItem(warehouse);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleFormSubmit = async (formData) => {
        try {
            if (editItem) {
                await WarehouseService.update(formData);
                showSnackbar("Gestiune actualizată cu succes!", 'success');
            } else {
                await WarehouseService.create(formData);
                showSnackbar("Gestiune creată cu succes!", 'success');
            }
            setIsModalOpen(false);
            fetchData(); 
        } catch (error) {
            showSnackbar(getFriendlyErrorMessage(error), 'error');
        }
    };

    // --- HANDLERS: CONFIRM DIALOG (TOGGLE STATUS) ---
    const handleRequestToggle = (warehouse) => {
        setConfirmDialog({
            open: true,
            warehouse: warehouse,
            type: warehouse.isActive ? 'DEACTIVATE' : 'ACTIVATE'
        });
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
    };

    const handleConfirmToggle = async () => {
        const { warehouse, type } = confirmDialog;
        if (!warehouse) return;

        try {
            await WarehouseService.toggleStatus(warehouse.id);
            showSnackbar(
                `Gestiune ${type === 'DEACTIVATE' ? 'dezactivată' : 'reactivată'} cu succes!`, 
                'success'
            );
            fetchData();
        } catch (error) {
            showSnackbar(getFriendlyErrorMessage(error), 'error');
        } finally {
            setConfirmDialog({ open: false, warehouse: null, type: 'DEACTIVATE' });
        }
    };

    return {
        // Data
        activeWarehouses,
        inactiveWarehouses,
        loading,
        
        // Modal State & Handlers
        isModalOpen,
        editItem,
        handleOpenCreate,
        handleOpenEdit,
        handleCloseModal,
        handleFormSubmit,

        // Confirm Dialog State & Handlers
        confirmDialog,
        handleRequestToggle,
        handleCloseConfirmDialog,
        handleConfirmToggle,

        // Snackbar State & Handlers
        snackbar,
        closeSnackbar
    };
};
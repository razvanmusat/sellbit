import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    selectActiveMenus, 
    selectInactiveMenus, 
    selectCompositeLoading,
    toggleMenuStatus,
    fetchCompositeMenus // <--- IMPORTĂM FETCH-UL
} from '../store/catalogSlice';

export const useProductComposite = () => {
    const dispatch = useDispatch();

    const loading = useSelector(selectCompositeLoading);
    const activeMenus = useSelector(selectActiveMenus);
    const inactiveMenus = useSelector(selectInactiveMenus);

    const [tabIndex, setTabIndex] = useState(0); 
    const [configModalOpen, setConfigModalOpen] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, menuId: null });

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => setSnackbar(prev => ({ ...prev, open: false }));

    const confirmDelete = async () => {
        const menuId = deleteDialog.menuId;
        setDeleteDialog({ open: false, menuId: null });

        try {
            // Acesta face deja dispatch(fetchCompositeMenus()) intern în slice după succes
            await dispatch(toggleMenuStatus({ id: menuId, isActive: false })).unwrap();
            showSnackbar("Meniul a fost dezactivat.");
        } catch (error) {
            showSnackbar("Eroare la dezactivare: " + error, "error");
        }
    };

    const handleReactivate = async (menuId) => {
        try {
            // Și acesta face refetch automat
            await dispatch(toggleMenuStatus({ id: menuId, isActive: true })).unwrap();
            showSnackbar("Meniul a fost reactivat.");
        } catch (error) {
            showSnackbar("Eroare la reactivare: " + error, "error");
        }
    };

    const handleConfigure = (menu) => {
        setSelectedMenu(menu);
        setConfigModalOpen(true);
    };

    // --- FIX: REÎNCĂRCARE DUPĂ MODIFICARE REȚETĂ ---
    const handleModalClose = (success) => {
        setConfigModalOpen(false);
        setSelectedMenu(null);
        if (success) {
            showSnackbar("Rețeta a fost actualizată cu succes!");
            // Forțăm reîncărcarea listei pentru a fi siguri
            dispatch(fetchCompositeMenus());
        }
    };
    // ------------------------------------------------

    const handleDeleteClick = (menuId) => setDeleteDialog({ open: true, menuId });

    return {
        loading, activeMenus, inactiveMenus, tabIndex, setTabIndex,
        configModalOpen, selectedMenu, snackbar, deleteDialog, setDeleteDialog,
        handleCloseSnackbar, handleConfigure, handleModalClose, handleDeleteClick,
        confirmDelete, handleReactivate
    };
};
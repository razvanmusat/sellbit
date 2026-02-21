import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    createUser,
    deactivateUser,
    fetchUsersData,
    reactivateUser,
    resetUserPassword,
    selectUsersState,
    updateUser
} from '../store/usersSlice';
import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';

export const useUsersMainPage = () => {
    const dispatch = useDispatch();
    const { activeUsers, inactiveUsers, roles, loading, actionLoading, error } = useSelector(selectUsersState);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editUser, setEditUser] = useState(null);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const [tempPassModal, setTempPassModal] = useState({
        open: false,
        username: '',
        tempPassword: '',
        context: 'create'
    });

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        user: null,
        action: null
    });

    const blurActiveElement = () => {
        if (typeof document === 'undefined') return;
        const active = document.activeElement;
        if (active && typeof active.blur === 'function') {
            active.blur();
        }
    };

    useEffect(() => {
        dispatch(fetchUsersData());
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            showSnackbar(error, 'error');
        }
    }, [error]);

    const showSnackbar = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const closeSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    const openTempPassword = (response, context) => {
        if (!response?.tempPassword) {
            return;
        }

        blurActiveElement();

        setTempPassModal({
            open: true,
            username: response.username,
            tempPassword: response.tempPassword,
            context
        });
    };

    const closeTempPassword = () => {
        setTempPassModal((prev) => ({ ...prev, open: false }));
    };

    const handleOpenCreate = () => {
        blurActiveElement();
        setEditUser(null);
        setIsFormOpen(true);
    };

    const handleOpenEdit = (user) => {
        blurActiveElement();
        setEditUser(user);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditUser(null);
    };

    const handleSubmitForm = async (payload) => {
        try {
            if (editUser) {
                await dispatch(updateUser({ id: editUser.id, payload })).unwrap();
                showSnackbar('Utilizator actualizat cu succes.');
                handleCloseForm();
            } else {
                const response = await dispatch(createUser(payload)).unwrap();
                showSnackbar('Utilizator creat cu succes.');
                handleCloseForm();
                setTimeout(() => {
                    openTempPassword(response, 'create');
                }, 0);
            }
        } catch (err) {
            showSnackbar(getFriendlyErrorMessage(err), 'error');
        }
    };

    const performDeactivate = async (user) => {
        try {
            await dispatch(deactivateUser(user.id)).unwrap();
            showSnackbar(`Utilizatorul ${user.fullName} a fost dezactivat.`);
        } catch (err) {
            showSnackbar(getFriendlyErrorMessage(err), 'error');
        }
    };

    const performResetPassword = async (user) => {
        try {
            const response = await dispatch(resetUserPassword(user.id)).unwrap();
            showSnackbar(`Parola utilizatorului ${user.fullName} a fost resetată.`);
            openTempPassword(response, 'reset');
        } catch (err) {
            showSnackbar(getFriendlyErrorMessage(err), 'error');
        }
    };

    const performReactivate = async (user) => {
        try {
            const response = await dispatch(reactivateUser(user.id)).unwrap();
            showSnackbar(`Utilizatorul ${user.fullName} a fost reactivat.`);
            openTempPassword(response, 'reactivate');
        } catch (err) {
            showSnackbar(getFriendlyErrorMessage(err), 'error');
        }
    };

    const handleRequestDeactivate = (user) => {
        blurActiveElement();
        setConfirmDialog({ open: true, user, action: 'deactivate' });
    };

    const handleRequestResetPassword = (user) => {
        blurActiveElement();
        setConfirmDialog({ open: true, user, action: 'reset' });
    };

    const handleRequestReactivate = (user) => {
        blurActiveElement();
        setConfirmDialog({ open: true, user, action: 'reactivate' });
    };

    const handleCloseConfirmDialog = () => {
        if (actionLoading) return;
        setConfirmDialog({ open: false, user: null, action: null });
    };

    const handleConfirmAction = async () => {
        const { user, action } = confirmDialog;
        if (!user || !action) return;

        if (action === 'deactivate') {
            await performDeactivate(user);
        }

        if (action === 'reset') {
            await performResetPassword(user);
        }

        if (action === 'reactivate') {
            await performReactivate(user);
        }

        setConfirmDialog({ open: false, user: null, action: null });
    };

    const hasData = useMemo(() => activeUsers.length > 0 || inactiveUsers.length > 0, [activeUsers, inactiveUsers]);

    return {
        activeUsers,
        inactiveUsers,
        roles,
        loading,
        actionLoading,
        error,
        hasData,

        isFormOpen,
        editUser,
        handleOpenCreate,
        handleOpenEdit,
        handleCloseForm,
        handleSubmitForm,

        handleRequestDeactivate,
        handleRequestResetPassword,
        handleRequestReactivate,

        confirmDialog,
        handleCloseConfirmDialog,
        handleConfirmAction,

        snackbar,
        closeSnackbar,

        tempPassModal,
        closeTempPassword
    };
};

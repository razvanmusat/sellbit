import React from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    Snackbar,
    Alert,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import UsersAccordion from '../components/UsersAccordion';
import UserFormModal from '../components/UserFormModal';
import TempPasswordModal from '../components/TempPasswordModal';
import { useUsersMainPage } from '../hooks/useUsersMainPage';

const UsersMainPage = () => {
    const {
        activeUsers,
        inactiveUsers,
        roles,
        loading,
        actionLoading,
        error,

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
    } = useUsersMainPage();

    return (
        <Box sx={{ p: 3, height: '100%', overflowY: 'auto', scrollbarGutter: 'stable' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">Administrare Utilizatori</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                    disabled={loading || actionLoading}
                >
                    Adaugă User
                </Button>
            </Box>

            {loading ? (
                <Box display="flex" justifyContent="center" py={6}>
                    <CircularProgress />
                </Box>
            ) : (
                <Stack spacing={2}>
                    <UsersAccordion
                        title="Utilizatori activi"
                        users={activeUsers}
                        defaultExpanded
                        emptyText="Nu există utilizatori activi."
                        activeSection
                        onEdit={handleOpenEdit}
                        onDeactivate={handleRequestDeactivate}
                        onResetPassword={handleRequestResetPassword}
                        actionLoading={actionLoading}
                    />

                    <UsersAccordion
                        title="Utilizatori inactivi"
                        users={inactiveUsers}
                        defaultExpanded={false}
                        emptyText="Nu există utilizatori inactivi."
                        activeSection={false}
                        onReactivate={handleRequestReactivate}
                        actionLoading={actionLoading}
                    />
                </Stack>
            )}

            <Dialog open={confirmDialog.open} onClose={handleCloseConfirmDialog}>
                <DialogTitle>
                    {confirmDialog.action === 'deactivate' && 'Confirmare Dezactivare'}
                    {confirmDialog.action === 'reset' && 'Confirmare Resetare Parolă'}
                    {confirmDialog.action === 'reactivate' && 'Confirmare Reactivare'}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {confirmDialog.action === 'deactivate' && (
                            <>Ești sigur că vrei să dezactivezi utilizatorul <strong>{confirmDialog.user?.fullName}</strong>?</>
                        )}
                        {confirmDialog.action === 'reset' && (
                            <>Ești sigur că vrei să resetezi parola pentru <strong>{confirmDialog.user?.fullName}</strong>?</>
                        )}
                        {confirmDialog.action === 'reactivate' && (
                            <>Ești sigur că vrei să reactivezi utilizatorul <strong>{confirmDialog.user?.fullName}</strong>? Parola va fi resetată automat.</>
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog} color="inherit" disabled={actionLoading}>Anulează</Button>
                    <Button
                        onClick={handleConfirmAction}
                        variant="contained"
                        color={confirmDialog.action === 'deactivate' ? 'error' : 'primary'}
                        disabled={actionLoading}
                    >
                        Confirmă
                    </Button>
                </DialogActions>
            </Dialog>

            <UserFormModal
                open={isFormOpen}
                onClose={handleCloseForm}
                onSubmit={handleSubmitForm}
                user={editUser}
                roles={roles}
                loading={actionLoading}
            />

            <TempPasswordModal
                open={tempPassModal.open}
                onClose={closeTempPassword}
                tempPassword={tempPassModal.tempPassword}
                username={tempPassModal.username}
                context={tempPassModal.context}
            />

            <Snackbar
                open={snackbar.open}
                onClose={closeSnackbar}
                autoHideDuration={4000}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled">
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UsersMainPage;

import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import { useVatRatesSettingsPage } from '../hooks/useVatRatesSettingsPage';
import VatRateFormDialog from '../components/VatRateFormDialog';

const VatRatesSettingsPage = () => {
  const {
    loading,
    saving,
    sortedItems,
    openForm,
    form,
    snackbar,
    handleOpenCreate,
    handleOpenEdit,
    closeForm,
    setField,
    handleSave,
    requestDeactivate,
    requestReactivate,
    confirmDialog,
    closeConfirmDialog,
    confirmAction,
    closeSnackbar,
  } = useVatRatesSettingsPage();

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">Setări TVA</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} disabled={saving}>
          Adaugă cotă TVA
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Modificările se aplică imediat pentru operațiile viitoare. Datele istorice rămân neschimbate.
      </Alert>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
      ) : (
        <Stack spacing={1.2}>
          {sortedItems.map((item) => (
            <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    {item.code}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {item.label}
                  </Typography>
                  <Chip
                    size="small"
                    color={item.isActive ? 'success' : 'default'}
                    label={`${Number(item.rate).toFixed(2)}%`}
                  />
                  {!item.isActive && <Chip size="small" label="Inactiv" />}
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenEdit(item)}
                    disabled={saving}
                  >
                    Editează
                  </Button>

                  {item.isActive ? (
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={() => requestDeactivate(item)}
                      disabled={saving}
                    >
                      Dezactivează
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      color="success"
                      variant="outlined"
                      startIcon={<RestoreIcon />}
                      onClick={() => requestReactivate(item)}
                      disabled={saving}
                    >
                      Reactivează
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog} fullWidth maxWidth="xs">
        <DialogTitle>
          {confirmDialog.type === 'deactivate' ? 'Confirmare dezactivare' : 'Confirmare reactivare'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.type === 'deactivate'
              ? `Ești sigur că vrei să dezactivezi cota ${confirmDialog.item?.label || ''}?`
              : `Ești sigur că vrei să reactivezi cota ${confirmDialog.item?.label || ''}?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDialog} color="inherit" disabled={saving}>Anulează</Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={confirmDialog.type === 'deactivate' ? 'error' : 'success'}
            disabled={saving}
          >
            Confirmă
          </Button>
        </DialogActions>
      </Dialog>

      <VatRateFormDialog
        open={openForm}
        onClose={closeForm}
        onSave={handleSave}
        saving={saving}
        form={form}
        setField={setField}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={closeSnackbar}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VatRatesSettingsPage;

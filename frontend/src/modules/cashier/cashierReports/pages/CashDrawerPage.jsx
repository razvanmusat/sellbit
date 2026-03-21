import React, { useState } from 'react';
import {
  Button, Typography, Box, CircularProgress,
  TextField, MenuItem, InputAdornment, Snackbar, Alert, Paper, Tabs, Tab
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useCashDrawer } from '../hooks/useCashDrawer';

const CashDrawerPage = () => {
  const { warehouses } = useOutletContext() || { warehouses: [] };
  const [searchParams, setSearchParams] = useSearchParams();

  const warehouseParam = searchParams.get('warehouseId');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    warehouseParam ? Number(warehouseParam) : null
  );

  const handleWarehouseChange = (e, newVal) => {
    setSelectedWarehouseId(newVal);
    const current = Object.fromEntries(searchParams);
    setSearchParams({ ...current, warehouseId: newVal }, { replace: true });
  };

  const {
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
    handleSubmit,
  } = useCashDrawer(selectedWarehouseId);

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>

      {/* SELECTOR GESTIUNI */}
      <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={selectedWarehouseId ?? false}
          onChange={handleWarehouseChange}
          textColor="primary"
          indicatorColor="primary"
          centered
        >
          {warehouses.map(w => (
            <Tab key={w.id} label={w.name} value={w.id} />
          ))}
        </Tabs>
      </Box>

      {/* ECRAN WELCOME */}
      {!selectedWarehouseId ? (
        <Box sx={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          mt: 8, gap: 2, color: 'text.secondary',
        }}>
          <StorefrontIcon sx={{ fontSize: 56, opacity: 0.3 }} />
          <Typography variant="h6" color="text.secondary">
            Selectează o gestiune pentru a vedea numerarul din sertar
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* SOLD SERTAR */}
          <Paper
            elevation={0}
            sx={{
              p: 2, mb: 4,
              bgcolor: '#f5f5f5',
              borderRadius: 4,
              width: '100%',
              maxWidth: 600,
              textAlign: 'center',
              border: '1px solid #e0e0e0',
              minHeight: '100px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {loading ? (
              <CircularProgress size={32} />
            ) : (
              <>
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  Numerar disponibil în sertar — <b>{selectedWarehouse?.name}</b>
                </Typography>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {Number(currentBalance).toFixed(2)}{' '}
                  <span style={{ fontSize: '1.2rem' }}>RON</span>
                </Typography>
              </>
            )}
          </Paper>

          {/* FORMULAR MIȘCARE */}
          <Box sx={{ width: '100%', maxWidth: 600 }}>
            {!showForm ? (
              <Box display="flex" justifyContent="center">
                <Button
                  variant="contained"
                  startIcon={<SwapHorizIcon />}
                  onClick={handleOpenForm}
                  size="large"
                  sx={{ px: 5, py: 1.5, fontSize: '1.1rem', borderRadius: 2 }}
                >
                  Înregistrează Mișcare Nouă
                </Button>
              </Box>
            ) : (
              <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight="bold" align="center" mb={2}>
                  Înregistrare Mișcare
                </Typography>

                <Box display="flex" flexDirection="column" gap={2}>
                  <Box display="flex" gap={2}>
                    <TextField
                      select
                      label="Tip Operațiune"
                      fullWidth
                      size="small"
                      value={formData.typeCode}
                      onChange={(e) => handleInputChange('typeCode', e.target.value)}
                      disabled={submitting}
                    >
                      {movementTypes.map((t) => (
                        <MenuItem key={t.id} value={t.code}>{t.label}</MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Sumă"
                      type="number"
                      fullWidth
                      size="small"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">RON</InputAdornment> } }}
                      disabled={submitting}
                    />
                  </Box>

                  <TextField
                    label="Explicație (Opțional)"
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={formData.note}
                    onChange={(e) => handleInputChange('note', e.target.value)}
                    disabled={submitting}
                  />

                  <Box display="flex" gap={2} mt={1}>
                    <Button
                      fullWidth variant="outlined" color="inherit"
                      onClick={handleCloseForm} disabled={submitting}
                    >
                      Anulează
                    </Button>
                    <Button
                      fullWidth variant="contained" color="primary"
                      onClick={handleSubmit} disabled={submitting}
                    >
                      {submitting ? <CircularProgress size={24} color="inherit" /> : 'Confirmă'}
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CashDrawerPage;
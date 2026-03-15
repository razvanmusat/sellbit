import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Typography, Box, CircularProgress,
  TextField, MenuItem, InputAdornment, Snackbar, Alert, Paper, Chip, Stack
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import { useCashDrawer } from '../hooks/useCashDrawer';

const CashDrawerPage = ({ warehouses }) => {
  // Selecție gestiune internă — implicit prima din listă
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    warehouses.length > 0 ? warehouses[0].id : null
  );

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
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* SELECTOR GESTIUNI — butoane chip centrate */}
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {warehouses.map(w => (
          <Chip
            key={w.id}
            label={w.name}
            onClick={() => setSelectedWarehouseId(w.id)}
            color={selectedWarehouseId === w.id ? 'primary' : 'default'}
            variant={selectedWarehouseId === w.id ? 'filled' : 'outlined'}
            sx={{ fontSize: '0.95rem', px: 1, py: 2.5 }}
          />
        ))}
      </Stack>

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
              Numerar disponibil în sertar
              {selectedWarehouse ? ` — ${selectedWarehouse.name}` : ''}
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

CashDrawerPage.propTypes = {
  warehouses: PropTypes.array.isRequired,
};

export default CashDrawerPage;
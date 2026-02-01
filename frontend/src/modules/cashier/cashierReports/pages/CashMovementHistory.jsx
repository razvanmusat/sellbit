import React from 'react';
import PropTypes from 'prop-types';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, 
  CircularProgress, Alert, Chip, MenuItem 
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro'; 
import dayjs from 'dayjs';

import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';

import { useCashMovementHistory } from '../hooks/useCashMovementHistory';

const CashMovementHistory = ({ warehouseId }) => {
  const {
    movementTypes,
    filteredMovements,
    loading,
    selectedType,
    setSelectedType,
    startDate,
    setStartDate,
    endDate,
    setEndDate
  } = useCashMovementHistory(warehouseId);

  const compactCellStyle = { padding: '4px 8px', width: '1%', whiteSpace: 'nowrap' };
  const fluidCellStyle = { padding: '4px 8px', width: 'auto' };

  if (!warehouseId) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ p: { xs: 1, sm: 2 } }}> 
        
        {/* ZONA DE FILTRE - RESPONSIVE */}
        <Paper 
            elevation={0} 
            sx={{ 
                p: 2, 
                mb: 3, 
                bgcolor: '#f5f5f5', 
                border: '1px solid #e0e0e0',
            }}
        >
            <Box 
                display="flex" 
                flexDirection={{ xs: 'column', sm: 'row' }} 
                alignItems="center" 
                gap={2} 
                flexWrap="wrap"
            >
                <Box display="flex" alignItems="center" gap={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
                    <HistoryIcon color="action" />
                </Box>
                
                <DatePicker 
                  label="De la"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  format="DD/MM/YYYY"
                  slotProps={{ 
                      textField: { 
                          size: 'small', 
                          sx: { bgcolor: 'white', width: { xs: '100%', sm: 160 } } 
                      } 
                  }}
                />

                <DatePicker 
                  label="Până la"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  format="DD/MM/YYYY"
                  slotProps={{ 
                      textField: { 
                          size: 'small', 
                          sx: { bgcolor: 'white', width: { xs: '100%', sm: 160 } } 
                      } 
                  }}
                />

                <TextField
                  select
                  size="small"
                  label="Tip Mișcare"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  sx={{ 
                      bgcolor: 'white', 
                      width: { xs: '100%', sm: 'auto' },
                      minWidth: { sm: 260 },
                      flexGrow: { sm: 1, md: 0 }
                  }}
                  // --- FIX SUPRAPUNERE ---
                  slotProps={{
                      select: {
                          displayEmpty: true // Permite afișarea textului când e gol
                      },
                      inputLabel: {
                          shrink: true // Ridică eticheta "Tip Mișcare" permanent sus
                      }
                  }}
                >
                  <MenuItem value="" disabled>
                      <em style={{ color: '#9e9e9e', fontStyle: 'normal' }}>Alege tip mișcare</em>
                  </MenuItem>
                  
                  {movementTypes.map((type) => (
                      <MenuItem key={type.code} value={type.code}>
                        {type.label}
                      </MenuItem>
                  ))}
                </TextField>
            </Box>
        </Paper>

        {/* ZONA DE TABEL */}
        {loading ? (
            <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : !selectedType ? (
            <Alert severity="info">Selectează un tip de mișcare din listă.</Alert>
        ) : filteredMovements.length === 0 ? (
            <Alert severity="warning">Nu există mișcări de acest tip în perioada selectată.</Alert>
        ) : (
            <TableContainer component={Paper} elevation={1} sx={{ overflowX: 'auto' }}>
            <Table size="small">
                <TableHead sx={{ bgcolor: '#eeeeee' }}>
                <TableRow>
                    <TableCell align="center" sx={compactCellStyle}>Data & Ora</TableCell>
                    <TableCell align="center" sx={compactCellStyle}>Tip</TableCell>
                    <TableCell align="center" sx={compactCellStyle}>Sumă</TableCell>
                    <TableCell align="center" sx={fluidCellStyle}>Explicație</TableCell>
                    <TableCell align="center" sx={compactCellStyle}>Utilizator</TableCell>
                </TableRow>
                </TableHead>
                
                <TableBody>
                {filteredMovements.map((mov) => (
                    <TableRow key={mov.id} hover>
                        <TableCell align="center" sx={compactCellStyle}>
                          {dayjs(mov.createdAt).format('DD/MM/YYYY HH:mm')}
                        </TableCell>
                        <TableCell align="center" sx={compactCellStyle}>
                            <Chip 
                                label={mov.typeLabel} 
                                size="small" 
                                color={['SALE', 'CASH_IN'].includes(mov.typeCode) ? "success" : "default"} 
                                variant="outlined" 
                            />
                        </TableCell>
                        <TableCell align="right" sx={compactCellStyle}>
                            <Typography fontWeight="bold" color={mov.amount >= 0 ? 'green' : 'error'}>
                                {mov.amount > 0 ? '+' : ''}{Number(mov.amount).toFixed(2)} RON
                            </Typography>
                        </TableCell>
                        <TableCell align="left" sx={{ ...fluidCellStyle, color: 'text.secondary', fontStyle: 'italic' }}>
                          {mov.note || '-'}
                        </TableCell>
                        <TableCell align="left" sx={compactCellStyle}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                                <PersonIcon fontSize="small" color="disabled" />
                                <Typography variant="body2">{mov.userName}</Typography>
                            </Box>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </TableContainer>
        )}
      </Box>
    </LocalizationProvider>
  );
};

CashMovementHistory.propTypes = {
  warehouseId: PropTypes.number.isRequired,
};

export default CashMovementHistory;
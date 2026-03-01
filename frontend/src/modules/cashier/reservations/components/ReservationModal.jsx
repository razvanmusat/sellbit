import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  InputAdornment, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { TimePicker, DatePicker } from '@mui/x-date-pickers'; // Importăm DatePicker
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { useReservationModalLogic } from '../hooks/useReservationModalLogic';
import PhoneInputIsolated from './PhoneInputIsolated'; 

const MemoizedTimePicker = React.memo(({ value, onChange, error, helperText }) => {
  return (
    <TimePicker
      label="Ora Start"
      value={value}
      onChange={onChange}
      ampm={false}
      viewRenderers={{ hours: null, minutes: null, seconds: null }}
      slotProps={{ 
          textField: { fullWidth: true, required: true, error: !!error, helperText: helperText } 
      }}
    />
  );
});
MemoizedTimePicker.displayName = 'MemoizedTimePicker';
MemoizedTimePicker.propTypes = {
    value: PropTypes.object,
    onChange: PropTypes.func,
    error: PropTypes.bool,
    helperText: PropTypes.string
};

const ReservationModal = (props) => {
  const { open, onClose, loading, editData, selectedDate } = props;

  const {
    startTime, endTime, advancePaid, digitalInvitation, errors,
    nameRef, amountRef, themeRef, noteRef, phoneRef,
    setAdvancePaid, setDigitalInvitation,
    handleTimeChange, handleDateChange, handleSubmit // Luăm noul handler
  } = useReservationModalLogic(props);

  // Calculăm titlul dinamic bazat pe startTime (care reflectă și editarea) sau selectedDate
  const displayDate = startTime ? startTime.format('DD/MM/YYYY') : (selectedDate?.format('DD/MM/YYYY') || '');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
        {/* Titlu Dinamic: Arată data curentă a rezervării în ambele moduri */}
        {editData ? `Modificare Rezervare - ${displayDate}` : `Rezervare Nouă - ${displayDate}`}
        
        <IconButton onClick={onClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
         <Box display="flex" flexDirection="column" gap={2} mt={1}>
             
             {/* 1. DATA & TIMP */}
             <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                 {/* NOU: DatePicker pentru a putea edita data */}
                 <DatePicker 
                    label="Data Eveniment"
                    value={startTime}
                    onChange={handleDateChange}
                    format="DD/MM/YYYY"
                    slotProps={{ textField: { fullWidth: true } }}
                 />

                 <MemoizedTimePicker 
                    value={startTime}
                    onChange={handleTimeChange}
                    error={!!errors.startAt}
                    helperText={errors.startAt}
                 />
                 
                 <TextField 
                    label="Ora Sfârșit"
                    value={endTime ? endTime.format('HH:mm') : '--:--'}
                    fullWidth disabled
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <AccessTimeIcon />
                                </InputAdornment>
                            )
                        }
                    }}
                 />
             </Box>
             
             {/* 2. NUME & TELEFON */}
             <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
                <TextField 
                    label="Nume Părinte" 
                    fullWidth 
                    inputRef={nameRef} 
                    error={!!errors.parentName} 
                    helperText={errors.parentName}
                    autoComplete="off"
                />
                
                <PhoneInputIsolated 
                    ref={phoneRef}
                    error={!!errors.parentPhone}
                    helperText={errors.parentPhone}
                />
             </Box>

             {/* 3. AVANS */}
             <Box p={1} border="1px solid #ddd" borderRadius={2} bgcolor={errors.advancePaid ? '#fff0f0' : 'transparent'}>
                <FormControl error={!!errors.advancePaid} fullWidth>
                    <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                        <FormLabel id="adv-l" sx={{ fontWeight: 'bold', color: 'text.primary', minWidth: '90px', fontSize: '0.95rem' }}>Avans plătit?</FormLabel>
                        <RadioGroup row aria-labelledby="adv-l" value={advancePaid === null ? '' : advancePaid.toString()} onChange={(e) => setAdvancePaid(e.target.value === 'true')}>
                            <FormControlLabel value="true" control={<Radio size="small" />} label="DA" sx={{ mr: 1 }} />
                            <FormControlLabel value="false" control={<Radio size="small" />} label="NU" sx={{ mr: 1 }} />
                        </RadioGroup>
                        {advancePaid === true && (
                            <TextField 
                                placeholder="Sumă" 
                                type="number" 
                                size="small" 
                                inputRef={amountRef} 
                                sx={{ width: '100px', m: 0 }} 
                                slotProps={{
                                    input: {
                                        endAdornment: <InputAdornment position="end" sx={{ mr: -1 }}>RON</InputAdornment>,
                                        style: { height: '35px', fontSize: '0.9rem' }
                                    }
                                }}
                                error={!!errors.advanceValue} 
                                autoFocus
                                autoComplete="off"
                                defaultValue={editData?.advanceAmount || ''}
                            />
                        )}
                    </Box>
                </FormControl>
             </Box>

             {/* 4. INVITAȚIE */}
             <Box p={1} border="1px solid #ddd" borderRadius={2} bgcolor={errors.digitalInvitation ? '#fff0f0' : 'transparent'}>
                 <FormControl error={!!errors.digitalInvitation} fullWidth>
                    <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                        <FormLabel id="inv-l" sx={{ fontWeight: 'bold', color: 'text.primary', minWidth: '90px', fontSize: '0.95rem' }}>Invitație digitală?</FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="inv-l"
                    value={digitalInvitation === false ? 'false' : 'pending'}
                    onChange={(e) => {
                      if (e.target.value === 'false') {
                        setDigitalInvitation(false);
                        return;
                      }
                      setDigitalInvitation(null);
                    }}
                  >
                    <FormControlLabel value="pending" control={<Radio size="small" />} label="DA" sx={{ mr: 1 }} />
                            <FormControlLabel value="false" control={<Radio size="small" />} label="NU" />
                        </RadioGroup>
                    </Box>
                 </FormControl>
             </Box>

             {/* 5. RESTUL (REFS) */}
             <TextField label="Tematică (Opțional)" fullWidth size="small" inputRef={themeRef} autoComplete="off" />
             <TextField fullWidth multiline rows={2} label="Notițe" placeholder="Detalii suplimentare..." inputRef={noteRef} autoComplete="off" />
         </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>Anulează</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Se salvează..." : "Salvează"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ReservationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  selectedDate: PropTypes.object,
  loading: PropTypes.bool,
  editData: PropTypes.object
};

export default ReservationModal;
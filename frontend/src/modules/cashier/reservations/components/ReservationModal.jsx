import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box,
  Radio, RadioGroup, FormControlLabel, FormControl, FormLabel,
  InputAdornment, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { TimePicker, DatePicker } from '@mui/x-date-pickers';
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
    startTime, endTime, advancePaid, digitalInvitation, digitalInvitationTouched, errors,
    childNameRef, childAgeRef, amountRef, themeRef, noteRef, phoneRef,
    setAdvancePaid, setDigitalInvitation, setDigitalInvitationTouched,
    handleTimeChange, handleDateChange, handleSubmit
  } = useReservationModalLogic(props);

  const displayDate = startTime ? startTime.format('DD/MM/YYYY') : (selectedDate?.format('DD/MM/YYYY') || '');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      disableRestoreFocus
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 0, sm: 4 },
          maxHeight: { xs: '100%', sm: 'calc(100% - 64px)' },
          height: { xs: '100%', sm: 'auto' },
          width: { xs: '100%', sm: '100%' },
          borderRadius: { xs: 0, sm: 2 },
        }
      }}
    >
      <DialogTitle display="flex" justifyContent="space-between" alignItems="center">
        {editData ? `Modificare Rezervare - ${displayDate}` : `Rezervare Nouă - ${displayDate}`}
        <IconButton onClick={onClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>

          {/* 1. DATA & TIMP */}
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
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
              fullWidth
              disabled
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

          {/* 2. NUME COPIL, VÂRSTĂ & TELEFON */}
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2}>
            <TextField
              label="Nume copil"
              fullWidth
              inputRef={childNameRef}
              error={!!errors.childName}
              helperText={errors.childName}
              autoComplete="off"
              sx={{ flex: 3 }}
            />
            <TextField
              label="Vârstă"
              type="number"
              inputRef={childAgeRef}
              onInput={(e) => e.target.value = e.target.value.slice(0, 2)}
              error={!!errors.childAge}
              helperText={errors.childAge}
              autoComplete="off"
              sx={{ flex: 1 }}
            />
            <Box sx={{ flex: 2 }}>
              <PhoneInputIsolated
                ref={phoneRef}
                error={!!errors.parentPhone}
                helperText={errors.parentPhone}
              />
            </Box>
          </Box>

          {/* 3. AVANS */}
          <Box p={1} border="1px solid #ddd" borderRadius={2} bgcolor={errors.advancePaid ? '#fff0f0' : 'transparent'}>
            <FormControl error={!!errors.advancePaid} fullWidth>
              <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                <FormLabel id="adv-l" sx={{ fontWeight: 'bold', color: 'text.primary', minWidth: '90px', fontSize: '0.95rem' }}>
                  Avans plătit?
                </FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="adv-l"
                  value={advancePaid === null ? '' : advancePaid.toString()}
                  onChange={(e) => setAdvancePaid(e.target.value === 'true')}
                >
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
                <FormLabel id="inv-l" sx={{ fontWeight: 'bold', color: 'text.primary', minWidth: '90px', fontSize: '0.95rem' }}>
                  Invitație digitală?
                </FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="inv-l"
                  value={digitalInvitationTouched ? (digitalInvitation === false ? 'false' : 'pending') : ''}
                  onChange={(e) => {
                    setDigitalInvitationTouched(true);
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
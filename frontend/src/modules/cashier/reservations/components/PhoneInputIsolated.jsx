import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { TextField, InputAdornment, Typography } from '@mui/material';

// Eliminam propTypes din parametri si din asignare pentru a scapa de eroare
const PhoneInputIsolated = forwardRef(({ error, helperText }, ref) => {
  const [internalValue, setInternalValue] = useState('');

  // Expunem metodele pentru părinte
  useImperativeHandle(ref, () => ({
    getValue: () => internalValue,
    setValue: (val) => setInternalValue(val)
  }));

  const handleChange = (e) => {
    const val = e.target.value;
    const numericVal = val.replace(/\D/g, ''); 
    
    if (numericVal.startsWith('00')) {
        if (numericVal.length <= 15) setInternalValue(numericVal);
    } else {
        if (numericVal.length <= 10) setInternalValue(numericVal);
    }
  };

  const isInternational = internalValue.startsWith('00');
  const phoneCounterText = isInternational ? `${internalValue.length} cifre` : `${internalValue.length}/10`;
  const phoneCounterColor = isInternational ? 'text.secondary' : (internalValue.length === 10 ? 'green' : 'text.disabled');

  return (
    <TextField 
        label="Telefon" 
        fullWidth 
        value={internalValue} 
        onChange={handleChange} 
        placeholder="07xx... sau 00xx..." 
        // Folosim slotProps pentru a evita eroarea deprecated la InputProps
        slotProps={{
            input: {
                endAdornment: (
                    <InputAdornment position="end">
                        <Typography variant="caption" color={phoneCounterColor}>
                            {phoneCounterText}
                        </Typography>
                    </InputAdornment>
                )
            }
        }}
        error={error} 
        helperText={helperText}
        autoComplete="off"
    />
  );
});

PhoneInputIsolated.displayName = "PhoneInputIsolated";

export default PhoneInputIsolated;
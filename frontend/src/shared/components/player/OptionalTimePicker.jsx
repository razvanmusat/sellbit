import React, { useState } from 'react';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { pickerChange, toTime } from './playerUtils';

// Ora petrecerii (opțională). Cât timp câmpul e gol și nu e selectat, în el scrie „Fără”;
// la selectare (sau când are valoare) apare eticheta normală, ca să se vadă care oră e.
const OptionalTimePicker = ({ label, value, onChange, sx }) => {
  const [focused, setFocused] = useState(false);
  return (
    <TimePicker
      label={!value && !focused ? 'Fără' : label}
      ampm={false}
      value={toTime(value)}
      onChange={pickerChange('HH:mm', onChange)}
      slotProps={{
        textField: { size: 'small', sx, onFocus: () => setFocused(true), onBlur: () => setFocused(false) },
        field: { clearable: true },
      }}
    />
  );
};

export default OptionalTimePicker;

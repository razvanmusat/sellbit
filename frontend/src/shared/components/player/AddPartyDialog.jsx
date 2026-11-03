import React, { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FilePickerField from './FilePickerField';
import SortableList from './SortableList';
import { pickerChange, toDate, toTime } from './playerUtils';
import { crossesMidnight, moveItem, partyDurationMinutes } from '../../hooks/usePlayer';

// Fiecare rând de fișier are un id propriu (cheie React și țintă la drag & drop).
let rowCounter = 0;
const newRow = () => {
  rowCounter += 1;
  return { id: `new-${rowCounter}`, file: '', imageMinutes: '' };
};

// Modală „Adaugă petrecere”: ziua, ora de început, ora de sfârșit și fișierele ei.
// Petrecerea se adaugă în program (se salvează apoi cu „Salvează și aplică”).
const AddPartyDialog = ({ onClose, onAdd, defaultDate, library, filesByName }) => {
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [files, setFiles] = useState(() => [newRow()]);

  const isImage = (fileName) => !!filesByName.get(fileName)?.image;
  const timesDiffer = partyDurationMinutes(start, end) !== null;
  const valid = !!date && !!start && !!end && timesDiffer && files.length > 0 && files.every((item) => item.file);

  const updateFile = (index, patch) => setFiles((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const submit = () => {
    if (!valid) return;
    onAdd({ date, start, end, files: files.map(({ file, imageMinutes }) => ({ file, imageMinutes })) });
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Adaugă petrecere</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="flex-start">
            <DatePicker
              label="Ziua"
              value={toDate(date)}
              onChange={(value) => {
                if (value && value.isValid()) setDate(value.format('YYYY-MM-DD'));
              }}
              slotProps={{ textField: { size: 'small' } }}
            />
            <TimePicker
              label="Ora de început"
              ampm={false}
              value={toTime(start)}
              onChange={pickerChange('HH:mm', setStart)}
              slotProps={{ textField: { size: 'small' } }}
            />
            <Box>
              <TimePicker
                label="Ora de sfârșit"
                ampm={false}
                value={toTime(end)}
                onChange={pickerChange('HH:mm', setEnd)}
                slotProps={{ textField: { size: 'small' } }}
              />
              {start && end && !timesDiffer && (
                <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                  Ora de sfârșit trebuie să fie diferită de ora de început.
                </Typography>
              )}
              {crossesMidnight(start, end) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>se termină a doua zi</Typography>
              )}
            </Box>
          </Stack>

          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Fișiere</Typography>
            <SortableList
              items={files}
              getKey={(item) => item.id}
              onMove={(from, to) => setFiles((prev) => moveItem(prev, from, to))}
              renderItem={(item, index, handle) => (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                  {handle}
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>{`${index + 1}.`}</Typography>
                  <FilePickerField
                    label="Fișier"
                    value={item.file}
                    library={library}
                    onChange={(value) => updateFile(index, { file: value })}
                    onAdd={() => setFiles((prev) => [...prev, newRow()])}
                    onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    removeDisabled={files.length === 1}
                    removeTitle={files.length === 1 ? 'Petrecerea trebuie să aibă cel puțin un fișier' : 'Scoate fișierul'}
                  />
                  {isImage(item.file) && (
                    <TextField
                      size="small"
                      type="number"
                      label="Minute pe ecran"
                      value={item.imageMinutes}
                      onChange={(event) => updateFile(index, { imageMinutes: event.target.value })}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                      sx={{ width: 150 }}
                    />
                  )}
                </Stack>
              )}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Anulează</Button>
        <Button onClick={submit} variant="contained" disabled={!valid}>Adaugă</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddPartyDialog;

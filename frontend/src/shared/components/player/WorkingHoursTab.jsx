import React from 'react';
import { Alert, Box, Button, Divider, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import FilePickerField from './FilePickerField';
import SortableList from './SortableList';
import InfoButton from './InfoButton';
import { HOURS_INFO } from './tabInfo';
import { pickerChange, toTime } from './playerUtils';

const WorkingHoursTab = ({ program, library, onChange, onAddStop, onUpdateStop, onRemoveStop, onMoveStop }) => (
  <Stack spacing={3}>
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Program de lucru</Typography>
        <InfoButton info={HOURS_INFO} />
      </Box>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <TimePicker
          label="Deschidere"
          ampm={false}
          value={toTime(program.open)}
          onChange={pickerChange('HH:mm', (value) => onChange('open', value))}
          slotProps={{ textField: { size: 'small' } }}
        />
        <TimePicker
          label="Închidere"
          ampm={false}
          value={toTime(program.close)}
          onChange={pickerChange('HH:mm', (value) => onChange('close', value))}
          slotProps={{ textField: { size: 'small' } }}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        În timpul programului rulează clipurile implicite și petrecerile. La închidere playerul se oprește;
        în afara programului, Play, Pauză și Stop se folosesc doar manual.
      </Typography>
    </Box>

    <Divider />

    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Poze fundal</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAddStop}>Adaugă poză</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Apar doar în timpul programului de lucru, când nu rulează niciun video implicit și niciun video de petrecere,
        și după apăsarea butonului Stop. O singură poză rămâne pe ecran permanent; cu mai multe, se schimbă între ele
        în ordinea de mai jos, în buclă, după secundele fiecăreia (gol = 10 secunde).
      </Typography>
      {program.stopImages.length === 0 ? (
        <Alert severity="info">Nicio poză de fundal. Apasă „Adaugă poză”.</Alert>
      ) : (
        <SortableList
          items={program.stopImages}
          getKey={(item) => item.id}
          onMove={onMoveStop}
          renderItem={(item, index, handle) => (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                {handle}
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>{`${index + 1}.`}</Typography>
                <FilePickerField
                  label="Poză"
                  value={item.file}
                  library={library}
                  imagesOnly
                  onChange={(value) => onUpdateStop(index, { file: value })}
                  sx={{ maxWidth: 420 }}
                />
                {program.stopImages.length > 1 && (
                  <TextField
                    size="small"
                    type="number"
                    label="Secunde pe ecran"
                    value={item.seconds}
                    onChange={(event) => onUpdateStop(index, { seconds: event.target.value })}
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    sx={{ width: 160 }}
                  />
                )}
                <Tooltip title="Scoate">
                  <IconButton color="error" aria-label="Scoate poza" onClick={() => onRemoveStop(index)}><DeleteIcon /></IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          )}
        />
      )}
    </Box>
  </Stack>
);

export default WorkingHoursTab;

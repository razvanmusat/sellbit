import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import FilePickerField from './FilePickerField';
import SortableList from './SortableList';
import AddPartyDialog from './AddPartyDialog';
import QuickRunDialog from './QuickRunDialog';
import InfoButton from './InfoButton';
import { PARTIES_INFO } from './tabInfo';
import { pickerChange, toDate, toTime } from './playerUtils';
import { compareParties, crossesMidnight, displayDate } from '../../hooks/usePlayer';

// Orele sunt înguste (jumătate din lățimea implicită), iar numele fișierului se vede mai mare și bold.
const TIME_FIELD_WIDTH = 125;
const FILE_TEXT_STYLE = { fontSize: '1.1rem', fontWeight: 700 };

const startTooltip = (saved, offline) => {
  if (!saved) return 'Salvează programul ca să poți porni petrecerea.';
  if (offline) return 'Playerul nu răspunde.';
  return 'Pornește petrecerea acum, ca un clip implicit: ignoră doar ora ei de început și de sfârșit. Următoarea petrecere programată pornește singură la ora ei, iar la închiderea programului playerul se oprește. Se oprește și cu Stop.';
};

const PartiesTab = ({
  program, library, filesByName, offline, commandBusy, isPartySaved, day, onDayChange,
  onAddParty, onQuickRun, onUpdateParty, onRemoveParty, onStartParty,
  onAddFile, onUpdateFile, onRemoveFile, onMoveFile,
}) => {
  const [dialog, setDialog] = useState(null); // 'add' | 'quick'
  const isImage = (fileName) => !!filesByName.get(fileName)?.image;

  const shiftDay = (delta) => onDayChange(dayjs(day).add(delta, 'day').format('YYYY-MM-DD'));

  // Doar petrecerile zilei alese, crescător după ora de început; indexul din program rămâne cel real.
  const dayParties = program.parties
    .map((party, index) => ({ party, index }))
    .filter(({ party }) => party.date === day)
    .sort((a, b) => compareParties(a.party, b.party));

  const renderParty = (party, partyIndex) => {
    const saved = isPartySaved(party);
    const canStart = saved && !offline && !commandBusy;
    return (
      <Paper key={party.id} variant="outlined" sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Box sx={{ flexShrink: 0 }}>
            <Stack direction="row" spacing={1}>
              <TimePicker
                label="Ora de început"
                ampm={false}
                value={toTime(party.start)}
                onChange={pickerChange('HH:mm', (start) => onUpdateParty(partyIndex, { start }))}
                slotProps={{ textField: { size: 'small', sx: { width: TIME_FIELD_WIDTH } } }}
              />
              <TimePicker
                label="Ora de sfârșit"
                ampm={false}
                value={toTime(party.end)}
                onChange={pickerChange('HH:mm', (end) => onUpdateParty(partyIndex, { end }))}
                slotProps={{ textField: { size: 'small', sx: { width: TIME_FIELD_WIDTH } } }}
              />
            </Stack>
            {crossesMidnight(party.start, party.end) && (
              <Typography variant="caption" color="text.secondary">se termină a doua zi</Typography>
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 0 } }}>
            {party.files.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Petrecerea nu are fișiere.</Typography>
                <Tooltip title="Adaugă fișier">
                  <IconButton size="small" aria-label="Adaugă fișier" onClick={() => onAddFile(partyIndex)}><AddIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
            ) : (
              <SortableList
                items={party.files}
                getKey={(file) => file.id}
                onMove={(from, to) => onMoveFile(partyIndex, from, to)}
                renderItem={(file, fileIndex, handle) => (
                  <Stack direction="row" spacing={1} alignItems="center">
                    {handle}
                    <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>{`${fileIndex + 1}.`}</Typography>
                    <FilePickerField
                      label="Fișier"
                      value={file.file}
                      library={library}
                      inputStyle={FILE_TEXT_STYLE}
                      onChange={(value) => onUpdateFile(partyIndex, fileIndex, { file: value })}
                      onAdd={() => onAddFile(partyIndex)}
                      onRemove={() => onRemoveFile(partyIndex, fileIndex)}
                      removeDisabled={party.files.length === 1}
                      removeTitle={party.files.length === 1 ? 'Petrecerea trebuie să aibă cel puțin un fișier' : 'Scoate fișierul'}
                    />
                    {isImage(file.file) && (
                      <TextField
                        size="small"
                        type="number"
                        label="Minute pe ecran"
                        value={file.imageMinutes}
                        onChange={(event) => onUpdateFile(partyIndex, fileIndex, { imageMinutes: event.target.value })}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        sx={{ width: 150 }}
                      />
                    )}
                  </Stack>
                )}
              />
            )}
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
            <Tooltip title={startTooltip(saved, offline)}>
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<PlayArrowIcon />}
                  disabled={!canStart}
                  onClick={() => onStartParty(party)}
                >
                  Pornește acum
                </Button>
              </Box>
            </Tooltip>
            <Tooltip title="Șterge petrecerea">
              <IconButton color="error" aria-label="Șterge petrecerea" onClick={() => onRemoveParty(partyIndex)}><DeleteIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Paper>
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1, minWidth: 100 }}>Petreceri</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="Ziua anterioară">
            <IconButton aria-label="Ziua anterioară" onClick={() => shiftDay(-1)}><ChevronLeftIcon /></IconButton>
          </Tooltip>
          <DatePicker
            value={toDate(day)}
            onChange={(value) => {
              if (value && value.isValid()) onDayChange(value.format('YYYY-MM-DD'));
            }}
            slotProps={{ textField: { size: 'small', sx: { width: 180 }, inputProps: { 'aria-label': 'Ziua afișată' } } }}
          />
          <Tooltip title="Ziua următoare">
            <IconButton aria-label="Ziua următoare" onClick={() => shiftDay(1)}><ChevronRightIcon /></IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setDialog('add')}>Adaugă petrecere</Button>
          <Tooltip title="Alege fișiere din foldere și rulează-le acum, fără să adaugi o petrecere în program.">
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <Button size="small" color="success" startIcon={<PlayArrowIcon />} disabled={offline || !!commandBusy} onClick={() => setDialog('quick')}>
                Rulează acum
              </Button>
            </Box>
          </Tooltip>
          <InfoButton info={PARTIES_INFO} />
        </Box>
      </Box>

      {dayParties.length === 0 ? (
        <Alert severity="info">{`Nicio petrecere pe ${displayDate(day)}.`}</Alert>
      ) : (
        <Stack spacing={1.5}>{dayParties.map(({ party, index }) => renderParty(party, index))}</Stack>
      )}

      {dialog === 'add' && (
        <AddPartyDialog
          defaultDate={day}
          library={library}
          filesByName={filesByName}
          onClose={() => setDialog(null)}
          onAdd={(party) => {
            onAddParty(party);
            onDayChange(party.date);
          }}
        />
      )}
      {dialog === 'quick' && (
        <QuickRunDialog library={library} onClose={() => setDialog(null)} onRun={onQuickRun} />
      )}

    </Box>
  );
};

export default PartiesTab;

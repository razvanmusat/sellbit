import React from 'react';
import { Alert, Box, Button, IconButton, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FilePickerField from './FilePickerField';
import SortableList from './SortableList';
import InfoButton from './InfoButton';
import { DEFAULT_CLIPS_INFO } from './tabInfo';
import { DAY_LABELS } from './playerUtils';
import { ALL_DAYS } from '../../hooks/usePlayer';

// Butoane de zi „în relief”: ridicate când nu sunt alese, apăsate și pline cu culoarea principală când sunt alese.
const DAY_BUTTON_SX = (theme) => ({
  width: 40, height: 40, p: 0, fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
  color: 'text.secondary', bgcolor: 'background.paper',
  boxShadow: `0 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)'}, inset 0 1px 0 rgba(255,255,255,0.35)`,
  '&:hover': { bgcolor: 'action.hover' },
  '&.Mui-selected': {
    color: 'primary.contrastText', bgcolor: 'primary.main',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.45)',
    '&:hover': { bgcolor: 'primary.dark' },
  },
});

const DefaultClipsTab = ({ program, library, filesByName, offline, commandBusy, onAdd, onUpdate, onRemove, onMove, onQuickRun }) => {
  const isImage = (fileName) => !!filesByName.get(fileName)?.image;
  const toQuick = (item) => {
    const seconds = Number(item.imageMinutes) * 60;
    return isImage(item.file) && seconds > 0 ? { file: item.file, imageSeconds: seconds } : { file: item.file };
  };
  const runNow = (item) => onQuickRun([toQuick(item)]);
  const withFile = program.defaultClips.filter((item) => item.file);
  const runAll = () => onQuickRun(withFile.map(toQuick));

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Clipuri implicite</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onAdd}>Adaugă</Button>
        <Tooltip title={offline ? 'Playerul nu răspunde.' : 'Rulează toate clipurile din listă, în ordine, în buclă, până la Stop, până începe o petrecere programată sau până la închiderea programului.'}>
          <Box component="span" sx={{ display: 'inline-flex', ml: 1 }}>
            <Button size="small" color="success" startIcon={<PlayArrowIcon />} disabled={withFile.length === 0 || offline || !!commandBusy} onClick={runAll}>
              Rulează toate
            </Button>
          </Box>
        </Tooltip>
        <InfoButton info={DEFAULT_CLIPS_INFO} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        Rulează în ordinea de mai jos, în timpul programului de lucru, în zilele bifate, când nu e petrecere.
        Ordinea se schimbă trăgând de mânerul din stânga unui rând. La poze alegi câte minute stau pe ecran (gol = 10 secunde).
      </Typography>

      {program.defaultClips.length === 0 ? (
        <Alert severity="info">Nu ai niciun clip implicit. Apasă „Adaugă”.</Alert>
      ) : (
        <SortableList
          items={program.defaultClips}
          getKey={(item) => item.id}
          onMove={onMove}
          renderItem={(item, index, handle) => (
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                {handle}
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 20 }}>{`${index + 1}.`}</Typography>
                <FilePickerField
                  label="Fișier"
                  value={item.file}
                  library={library}
                  onChange={(value) => onUpdate(index, { file: value })}
                />
                <ToggleButtonGroup
                  value={item.days}
                  onChange={(_, value) => onUpdate(index, { days: value })}
                  sx={{ gap: 0.75, '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '8px !important', m: 0 } }}
                >
                  {ALL_DAYS.map((day) => (
                    <ToggleButton key={day} value={day} sx={DAY_BUTTON_SX}>{DAY_LABELS[day]}</ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {isImage(item.file) && (
                  <TextField
                    size="small"
                    type="number"
                    label="Minute pe ecran"
                    value={item.imageMinutes}
                    onChange={(event) => onUpdate(index, { imageMinutes: event.target.value })}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    sx={{ width: 150 }}
                  />
                )}
                <Tooltip title={offline ? 'Playerul nu răspunde.' : 'Rulează doar acest clip, până la Stop, până începe o petrecere programată sau până la închiderea programului.'}>
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<PlayArrowIcon />}
                      disabled={!item.file || offline || !!commandBusy}
                      onClick={() => runNow(item)}
                    >
                      Pornește acum
                    </Button>
                  </Box>
                </Tooltip>
                <Tooltip title="Scoate">
                  <IconButton color="error" onClick={() => onRemove(index)}><DeleteIcon /></IconButton>
                </Tooltip>
              </Stack>
            </Paper>
          )}
        />
      )}
    </Box>
  );
};

export default DefaultClipsTab;

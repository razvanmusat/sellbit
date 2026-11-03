import React from 'react';
import { Box, Button, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { MANUAL_LABELS, shortName, targetLabel } from './playerUtils';

const COMMANDS = [
  { command: 'play', label: 'Play', icon: <PlayArrowIcon />, color: 'success' },
  { command: 'pause', label: 'Pauză', icon: <PauseIcon />, color: 'primary' },
  { command: 'stop', label: 'Stop', icon: <StopIcon />, color: 'error' },
  { command: 'next', label: 'Următorul', icon: <SkipNextIcon />, color: 'primary' },
];

const StatusChips = ({ offline, status }) => {
  if (offline) {
    return <Chip color="error" label="Player offline" />;
  }
  if (!status) {
    return <Chip label="Se verifică..." />;
  }
  const lastSync = status.last_sync;
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
      <Chip color="success" label="Player online" />
      <Chip
        color={status.mpv_running ? 'primary' : 'default'}
        label={status.mpv_running
          ? `${status.paused ? 'Pauză' : 'Rulează'}: ${shortName(status.playing)}`
          : 'Nu rulează nimic'}
      />
      <Chip variant="outlined" label={targetLabel(status.target)} />
      {status.manual && <Chip variant="outlined" color="warning" label={status.manual === 'party' && status.party === 'adhoc' ? 'Video pornit manual' : (MANUAL_LABELS[status.manual] || status.manual)} />}
      {status.syncing && <Chip variant="outlined" label="Se sincronizează..." />}
      {status.party_loading && <Chip variant="outlined" label="Se descarcă fișierele pentru rulare..." />}
      {status.quick_error && <Chip color="warning" label={`Rulare rapidă eșuată: ${status.quick_error}`} />}
      {typeof status.free_mb === 'number' && <Chip variant="outlined" label={`Liber: ${Math.round(status.free_mb / 1024)} GB`} />}
      {lastSync && lastSync.ok === false && (
        <Chip
          color="warning"
          label={`Ultima sincronizare a eșuat: ${lastSync.message || ''}${
            Array.isArray(lastSync.failed) && lastSync.failed.length > 0
              ? ` (netrase: ${lastSync.failed.map(shortName).join(', ')})`
              : ''
          }`}
        />
      )}
    </Stack>
  );
};

// Bara playerului: rămâne fixă sub bara de sus a aplicației, la derulare.
const PlayerBar = ({ status, offline, commandBusy, onCommand }) => (
  <Box>
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>Player TV</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {COMMANDS.map((item) => (
            <Button
              key={item.command}
              size="small"
              variant="contained"
              color={item.color}
              startIcon={commandBusy === item.command ? <CircularProgress size={16} color="inherit" /> : item.icon}
              disabled={!!commandBusy}
              onClick={() => onCommand(item.command)}
            >
              {item.label}
            </Button>
          ))}
        </Stack>
        <StatusChips offline={offline} status={status} />
      </Stack>
    </Paper>
  </Box>
);

export default PlayerBar;

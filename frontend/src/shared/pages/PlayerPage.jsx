import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import {
  Alert, Box, Button, Divider, IconButton, LinearProgress, Paper, Snackbar, Stack, Tab, Tabs, Tooltip,
} from '@mui/material';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro';
import { usePlayer, TOAST_MS } from '../hooks/usePlayer';
import PlayerBar from '../components/player/PlayerBar';
import FilesTab from '../components/player/FilesTab';
import WorkingHoursTab from '../components/player/WorkingHoursTab';
import DefaultClipsTab from '../components/player/DefaultClipsTab';
import PartiesTab from '../components/player/PartiesTab';
import PlaybackErrorDialog from '../components/player/PlaybackErrorDialog';

const TAB_FILES = 0;

const PlayerPage = () => {
  // toate tooltip-urile din pagina Player apar deasupra elementului
  const outerTheme = useTheme();
  const playerTheme = useMemo(
    () => createTheme(outerTheme, { components: { MuiTooltip: { defaultProps: { placement: 'top' } } } }),
    [outerTheme]
  );
  const user = useSelector((state) => state.auth.user);
  const isAdmin = user?.authorityLevel === 100;
  const [tab, setTab] = useState(TAB_FILES);
  // ziua afișată la Petreceri (implicit azi); stă aici ca să nu revină la azi când schimbi tabul
  const [partyDay, setPartyDay] = useState(() => dayjs().format('YYYY-MM-DD'));

  const {
    library, filesByName, program, status, offline, playbackError, closePlaybackError,
    loading, saving, commandBusy, uploadProgress,
    toast, closeToast,
    reload, sendCommand, startParty, startQuick, isPartySaved, uploadFiles, deleteFile, renameFile,
    createFolder, renameFolder, deleteFolder, moveFile,
    setProgramField,
    addStopImage, updateStopImage, removeStopImage, moveStopImage,
    addDefault, updateDefault, removeDefault, moveDefault,
    addParty, updateParty, removeParty,
    addPartyFile, updatePartyFile, removePartyFile, movePartyFile,
    saveProgram,
  } = usePlayer();

  const renderTab = () => {
    switch (tab) {
      case 0:
        return (
          <FilesTab
            library={library}
            uploadProgress={uploadProgress}
            isAdmin={isAdmin}
            onUpload={uploadFiles}
            onRename={renameFile}
            onDelete={deleteFile}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveFile={moveFile}
          />
        );
      case 1:
        return (
          <WorkingHoursTab
            program={program}
            library={library}
            onChange={setProgramField}
            onAddStop={addStopImage}
            onUpdateStop={updateStopImage}
            onRemoveStop={removeStopImage}
            onMoveStop={moveStopImage}
          />
        );
      case 2:
        return (
          <DefaultClipsTab
            program={program}
            library={library}
            filesByName={filesByName}
            offline={offline}
            commandBusy={commandBusy}
            onQuickRun={startQuick}
            onAdd={addDefault}
            onUpdate={updateDefault}
            onRemove={removeDefault}
            onMove={moveDefault}
          />
        );
      default:
        return (
          <PartiesTab
            program={program}
            library={library}
            filesByName={filesByName}
            offline={offline}
            commandBusy={commandBusy}
            isPartySaved={isPartySaved}
            day={partyDay}
            onDayChange={setPartyDay}
            onAddParty={addParty}
            onQuickRun={startQuick}
            onUpdateParty={updateParty}
            onRemoveParty={removeParty}
            onStartParty={startParty}
            onAddFile={addPartyFile}
            onUpdateFile={updatePartyFile}
            onRemoveFile={removePartyFile}
            onMoveFile={movePartyFile}
          />
        );
    }
  };

  return (
    <ThemeProvider theme={playerTheme}>
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Box sx={{ width: { xs: '100%', md: '90%' }, mx: 'auto', bgcolor: 'inherit' }}>
        {/* Bara playerului: fixă, lipită sub bara de sus la derulare. `main` din layout are padding p: 2 și un element
            sticky se lipește față de conținutul lui, deci top: -2 anulează acel padding. mx/px: fundalul acoperă toată lățimea. */}
        <Box
          sx={{
            position: 'sticky',
            top: (theme) => theme.spacing(-2),
            zIndex: 10,
            bgcolor: 'inherit',
            mx: -2,
            px: 2,
            pb: 1,
          }}
        >
          <PlayerBar
            status={status}
            offline={offline}
            commandBusy={commandBusy}
            onCommand={sendCommand}
          />
        </Box>

        <Paper variant="outlined" sx={{ mt: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ pr: 1.5 }}>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" sx={{ flex: 1 }}>
              <Tab label="Fișiere încărcate" />
              <Tab label="Program de lucru" />
              <Tab label="Clipuri implicite" />
              <Tab label="Petreceri" />
            </Tabs>
            <Tooltip title="Reîncarcă">
              <span>
                <IconButton onClick={reload} disabled={loading || saving}><RefreshIcon /></IconButton>
              </span>
            </Tooltip>
            {tab !== TAB_FILES && (
              <Button variant="contained" onClick={saveProgram} disabled={saving || loading}>
                {saving ? 'Se salvează...' : 'Salvează și aplică'}
              </Button>
            )}
          </Stack>
          <Divider />
          {loading && <LinearProgress />}
          <Box sx={{ p: 2 }}>{renderTab()}</Box>
        </Paper>
      </Box>

      <PlaybackErrorDialog error={playbackError} onClose={closePlaybackError} />

      {/* key = numărul mesajului: un mesaj nou înlocuiește imediat pe cel vechi și are propriile 4 secunde */}
      <Snackbar
        key={toast.key}
        open={toast.open}
        autoHideDuration={TOAST_MS}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        onClose={(_, reason) => {
          if (reason === 'clickaway') return;
          closeToast();
        }}
      >
        <Alert severity={toast.severity} variant="filled" onClose={closeToast}>
          {toast.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
    </ThemeProvider>
  );
};

export default PlayerPage;

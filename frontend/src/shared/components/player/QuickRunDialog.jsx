import React, { useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List,
  ListItemButton, ListItemIcon, ListItemText, Paper, Typography,
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import ImageIcon from '@mui/icons-material/Image';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FolderList from './FolderList';
import { fileLabel, filesInFolder, formatSize, initialFolder } from './playerUtils';

// Alegi fișiere din foldere (mai multe, în ordinea în care le alegi) și le rulezi acum, fără să adaugi o petrecere.
const QuickRunDialog = ({ onClose, onRun, library }) => {
  const { files, folders, assignments } = library;
  const [folder, setFolder] = useState(() => initialFolder(files, folders, assignments, null));
  const [selected, setSelected] = useState([]); // numele fișierelor, în ordinea alegerii
  const [busy, setBusy] = useState(false);

  const activeFolder = folders.includes(folder) ? folder : (folders[0] || null);
  const visible = activeFolder ? filesInFolder(files, assignments, activeFolder) : [];
  const byName = new Map(files.map((file) => [file.fileName, file]));

  const toggle = (name) => setSelected((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));

  const run = async () => {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    const ok = await onRun(selected.map((file) => ({ file })));
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Rulează acum</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {folders.length === 0 ? (
          <Alert severity="warning" sx={{ m: 2 }}>
            Nu există niciun folder. Creează un folder în tabul „Fișiere încărcate” și încarcă fișiere în el.
          </Alert>
        ) : (
          <>
            <Box sx={{ display: 'flex', height: 300 }}>
              <Paper variant="outlined" square sx={{ width: 190, flexShrink: 0, overflow: 'auto', borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
                <FolderList files={files} folders={folders} assignments={assignments} view={activeFolder} onSelect={setFolder} />
              </Paper>
              <Box sx={{ flex: 1, overflow: 'auto' }}>
                {visible.length === 0 ? (
                  <Alert severity="info" sx={{ m: 1.5 }}>Nu sunt fișiere în acest folder.</Alert>
                ) : (
                  <List dense disablePadding>
                    {visible.map((file) => (
                      <ListItemButton key={file.fileName} onClick={() => toggle(file.fileName)}>
                        <Checkbox edge="start" size="small" checked={selected.includes(file.fileName)} tabIndex={-1} disableRipple />
                        <ListItemIcon sx={{ minWidth: 32 }}>{file.image ? <ImageIcon fontSize="small" /> : <MovieIcon fontSize="small" />}</ListItemIcon>
                        <ListItemText primary={fileLabel(file)} secondary={formatSize(file.size)} />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>
            </Box>
            <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                {selected.length === 0
                  ? 'Alege fișierele (din mai multe foldere, dacă vrei). Rulează în ordinea alegerii, fără să fie adăugate în program.'
                  : `${selected.length} selectate, în ordinea alegerii:`}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 84, overflow: 'auto' }}>
                {selected.map((name, index) => (
                  <Chip
                    key={name}
                    size="small"
                    label={`${index + 1}. ${byName.get(name) ? fileLabel(byName.get(name)) : name}`}
                    onDelete={() => toggle(name)}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={busy}>Anulează</Button>
        <Button
          onClick={run}
          variant="contained"
          color="success"
          disabled={selected.length === 0 || busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
        >
          Rulează acum
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickRunDialog;

import React, { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItemButton, ListItemIcon,
  ListItemText, Paper,
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import ImageIcon from '@mui/icons-material/Image';
import FolderList from './FolderList';
import { FilePreviewDialog, PreviewIconButton } from './FilePreview';
import { fileLabel, filesInFolder, formatSize, initialFolder } from './playerUtils';

// Modală mică: alegi un folder și apoi fișierul din el. imagesOnly = doar poze (poza de fundal).
const FilePickerDialog = ({ open, onClose, onSelect, library, imagesOnly = false, currentValue }) => {
  const { folders, assignments } = library;
  const files = imagesOnly ? library.files.filter((file) => file.image) : library.files;
  const [previewFile, setPreviewFile] = useState(null);
  const [folder, setFolder] = useState(() => initialFolder(files, folders, assignments, currentValue));

  // dacă folderul ales a dispărut între timp, trecem pe primul
  const activeFolder = folders.includes(folder) ? folder : (folders[0] || null);
  const visible = activeFolder ? filesInFolder(files, assignments, activeFolder) : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{imagesOnly ? 'Alege o poză' : 'Alege un fișier'}</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {folders.length === 0 ? (
          <Alert severity="warning" sx={{ m: 2 }}>
            Nu există niciun folder. Creează un folder în tabul „Fișiere încărcate” și încarcă fișiere în el.
          </Alert>
        ) : (
        <Box sx={{ display: 'flex', height: 340 }}>
          <Paper variant="outlined" square sx={{ width: 190, flexShrink: 0, overflow: 'auto', borderTop: 0, borderBottom: 0, borderLeft: 0 }}>
            <FolderList files={files} folders={folders} assignments={assignments} view={activeFolder} onSelect={setFolder} />
          </Paper>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {visible.length === 0 ? (
              <Alert severity="info" sx={{ m: 1.5 }}>Nu sunt fișiere în acest folder.</Alert>
            ) : (
              <List dense disablePadding>
                {visible.map((file) => (
                  <ListItemButton
                    key={file.fileName}
                    selected={file.fileName === currentValue}
                    onClick={() => onSelect(file.fileName)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{file.image ? <ImageIcon /> : <MovieIcon />}</ListItemIcon>
                    <ListItemText primary={fileLabel(file)} secondary={formatSize(file.size)} />
                    <PreviewIconButton file={file} onOpen={setPreviewFile} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Anulează</Button>
      </DialogActions>
      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
    </Dialog>
  );
};

export default FilePickerDialog;

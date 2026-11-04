import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, InputAdornment, LinearProgress, List, ListItem, ListItemIcon, ListItemText, Menu, MenuItem, Paper,
  TextField, Tooltip, Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MovieIcon from '@mui/icons-material/Movie';
import ImageIcon from '@mui/icons-material/Image';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import FolderList from './FolderList';
import { FilePreviewDialog, PreviewIconButton } from './FilePreview';
import InfoButton from './InfoButton';
import { FILES_INFO } from './tabInfo';
import { fileLabel, filesInFolder, formatSize, splitExtension } from './playerUtils';

// Dialog cu un câmp de text: folder nou, redenumire folder. onSubmit întoarce true dacă a reușit.
const NameDialog = ({ title, label, initial = '', submitLabel, helperText, onClose, onSubmit }) => {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const trimmed = name.trim();
  const canSave = trimmed !== '' && trimmed !== initial && !busy;

  const submit = async () => {
    if (!canSave) return;
    setBusy(true);
    const ok = await onSubmit(trimmed);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label={label}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          disabled={busy}
          helperText={helperText}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={busy}>Anulează</Button>
        <Button
          onClick={submit}
          variant="contained"
          disabled={!canSave}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RenameFileDialog = ({ file, onClose, onSubmit }) => {
  const { base, ext } = splitExtension(fileLabel(file));
  const [name, setName] = useState(base);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const canSave = trimmed !== '' && trimmed !== base && !busy;

  const submit = async () => {
    if (!canSave) return;
    setBusy(true);
    const ok = await onSubmit(file, trimmed);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Redenumește fișierul</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          margin="dense"
          label="Nume nou"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          disabled={busy}
          slotProps={{ input: { endAdornment: ext ? <InputAdornment position="end">{ext}</InputAdornment> : undefined } }}
          helperText="Extensia nu se schimbă. Spațiile și caracterele speciale devin _. Dacă fișierul e în program, programul se actualizează singur."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={busy}>Anulează</Button>
        <Button
          onClick={submit}
          variant="contained"
          disabled={!canSave}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Redenumește
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const FilesTab = ({
  library, uploadProgress, isAdmin,
  onUpload, onRename, onDelete,
  onCreateFolder, onRenameFolder, onDeleteFolder, onMoveFile,
}) => {
  const { files, folders, assignments } = library;
  const fileInputRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [folderDialog, setFolderDialog] = useState(null); // { mode: 'create' } | { mode: 'rename', name }
  const [deleteFolderTarget, setDeleteFolderTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [moveMenu, setMoveMenu] = useState(null); // { anchor, file }
  const [previewFile, setPreviewFile] = useState(null);

  // folderul ales; dacă nu mai există (șters sau redenumit) sau nu e ales niciunul, primul
  const folder = folders.includes(selected) ? selected : (folders[0] || null);
  const visible = folder ? filesInFolder(files, assignments, folder) : [];

  const handlePickFiles = async (event) => {
    if (folder) await onUpload(event.target.files, folder);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target) await onDelete(target);
  };

  const confirmDeleteFolder = async () => {
    const target = deleteFolderTarget;
    setDeleteFolderTarget(null);
    if (target) await onDeleteFolder(target);
  };

  const moveTo = async (target) => {
    const file = moveMenu?.file;
    setMoveMenu(null);
    if (file) await onMoveFile(file, target);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>
      <Paper variant="outlined" sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, py: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>Foldere</Typography>
          {isAdmin && (
            <Tooltip title="Adaugă folder">
              <IconButton size="small" aria-label="Adaugă folder" onClick={() => setFolderDialog({ mode: 'create' })}>
                <CreateNewFolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <InfoButton info={FILES_INFO} />
        </Box>
        <Divider />
        {folders.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>Niciun folder.</Typography>
        ) : (
          <FolderList files={files} folders={folders} assignments={assignments} view={folder} onSelect={setSelected} />
        )}
      </Paper>

      <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        {!folder ? (
          <Alert
            severity="info"
            action={isAdmin ? (
              <Button color="inherit" size="small" sx={{ whiteSpace: 'nowrap' }} onClick={() => setFolderDialog({ mode: 'create' })}>Adaugă folder</Button>
            ) : undefined}
          >
            {isAdmin
              ? 'Creează un folder ca să poți încărca fișiere. Fișierele de până acum intră în primul folder creat.'
              : 'Nu există niciun folder. Cere unui administrator să creeze unul, ca să poți încărca fișiere.'}
          </Alert>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>{folder}</Typography>
              {isAdmin && (
                <>
                  <Tooltip title="Redenumește folderul">
                    <IconButton size="small" aria-label="Redenumește folderul" onClick={() => setFolderDialog({ mode: 'rename', name: folder })}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={visible.length > 0 ? 'Folderul are fișiere. Mută-le în alt folder înainte să-l ștergi.' : 'Șterge folderul'}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Șterge folderul"
                        disabled={visible.length > 0}
                        onClick={() => setDeleteFolderTarget(folder)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </>
              )}
              <Box sx={{ flex: 1 }} />
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept=".mp4,.jpg,.jpeg,.png"
                onChange={handlePickFiles}
              />
              <Button
                variant="contained"
                startIcon={<UploadFileIcon />}
                disabled={uploadProgress.active}
                onClick={() => fileInputRef.current?.click()}
              >
                {`Încarcă în „${folder}”`}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Video MP4 (H.264, până la 1080p30) și poze JPG / PNG.
            </Typography>

            {uploadProgress.active && (
              <Box sx={{ my: 1 }}>
                <Typography variant="caption">
                  {`${uploadProgress.fileName} (${uploadProgress.index}/${uploadProgress.total}) - ${uploadProgress.percent}%`}
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress.percent} />
              </Box>
            )}

            {visible.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>Folderul e gol. Încarcă fișiere în el.</Alert>
            ) : (
              <List dense>
                {visible.map((file) => (
                  <ListItem
                    key={file.fileName}
                    divider
                    secondaryAction={(
                      <Box>
                        <Tooltip title="Mută în alt folder">
                          <span>
                            <IconButton
                              aria-label="Mută în alt folder"
                              disabled={folders.length < 2}
                              onClick={(event) => setMoveMenu({ anchor: event.currentTarget, file })}
                              sx={{ mr: isAdmin ? 0.5 : 0 }}
                            >
                              <DriveFileMoveIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <PreviewIconButton file={file} onOpen={setPreviewFile} size="medium" />
                        {isAdmin && (
                          <>
                            <Tooltip title="Redenumește">
                              <IconButton aria-label="Redenumește" onClick={() => setRenameTarget(file)} sx={{ mr: 0.5 }}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Șterge">
                              <IconButton edge="end" color="error" aria-label="Șterge" onClick={() => setDeleteTarget(file)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Box>
                    )}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{file.image ? <ImageIcon /> : <MovieIcon />}</ListItemIcon>
                    <ListItemText primary={fileLabel(file)} secondary={formatSize(file.size)} />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </Box>

      <Menu anchorEl={moveMenu?.anchor} open={!!moveMenu} onClose={() => setMoveMenu(null)}>
        {folders.map((name) => (
          <MenuItem
            key={name}
            selected={!!moveMenu && assignments[moveMenu.file.fileName] === name}
            disabled={!!moveMenu && assignments[moveMenu.file.fileName] === name}
            onClick={() => moveTo(name)}
          >
            {name}
          </MenuItem>
        ))}
      </Menu>

      {folderDialog?.mode === 'create' && (
        <NameDialog
          title="Folder nou"
          label="Numele folderului"
          submitLabel="Creează"
          helperText="Orice nume, maxim 60 de caractere."
          onClose={() => setFolderDialog(null)}
          onSubmit={async (name) => {
            const ok = await onCreateFolder(name);
            if (ok) setSelected(name);
            return ok;
          }}
        />
      )}
      {folderDialog?.mode === 'rename' && (
        <NameDialog
          key={folderDialog.name}
          title="Redenumește folderul"
          label="Nume nou"
          initial={folderDialog.name}
          submitLabel="Redenumește"
          onClose={() => setFolderDialog(null)}
          onSubmit={async (name) => {
            const ok = await onRenameFolder(folderDialog.name, name);
            if (ok && selected === folderDialog.name) setSelected(name);
            return ok;
          }}
        />
      )}

      <Dialog open={!!deleteFolderTarget} onClose={() => setDeleteFolderTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Ștergi folderul?</DialogTitle>
        <DialogContent>
          <Typography>{deleteFolderTarget}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteFolderTarget(null)} color="inherit">Anulează</Button>
          <Button onClick={confirmDeleteFolder} color="error" variant="contained">Șterge folderul</Button>
        </DialogActions>
      </Dialog>

      {renameTarget && (
        <RenameFileDialog
          key={renameTarget.fileName}
          file={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSubmit={onRename}
        />
      )}

      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Ștergi fișierul?</DialogTitle>
        <DialogContent>
          <Typography>{deleteTarget ? fileLabel(deleteTarget) : ''}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Anulează</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">Șterge</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FilesTab;

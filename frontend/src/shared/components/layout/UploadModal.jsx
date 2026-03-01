import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  IconButton,
  Tooltip,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  LinearProgress,
  Typography,
  Snackbar,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RefreshIcon from '@mui/icons-material/Refresh';
import { UploadService } from '../../api/UploadService';
import PreviewFileContent from './PreviewFileContent';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';

const UploadModal = ({ open, onClose, isAdmin }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [preview, setPreview] = useState({ open: false, file: null, folder: '' });
  const [fileDeleteDialog, setFileDeleteDialog] = useState({ open: false, file: null, folder: '' });
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [uploadProgress, setUploadProgress] = useState({ active: false, percent: 0, fileName: '' });

  const [dialog, setDialog] = useState({ open: false, type: '', value: '' });
  useEffect(() => {
    if (open) loadFolders();
  }, [open]);

  useEffect(() => {
    if (folders.length > 0 && typeof folders[activeTab] === 'string') {
      loadFiles(folders[activeTab]);
    } else {
      setFiles([]);
    }
  }, [activeTab, folders]);

  const loadFiles = async (folder) => {
    try {
      const result = await UploadService.list(folder);
      setFiles(result);
      console.log('[DEBUG][FRONTEND] files in folder', folder, result);
    } catch (error) {
      setFiles([]);
    }
  };

  const loadFolders = async () => {
    setLoadingFolders(true);
    setFolderError('');
    try {
      const result = await UploadService.listFolders();
      console.log('[DEBUG][FRONTEND] listFolders API response:', result);
      // Filtrează duplicatele și elementele goale
      const uniqueFolders = Array.from(new Set(result.filter(f => typeof f === 'string' && f.trim())));
      console.log('[DEBUG][FRONTEND] uniqueFolders:', uniqueFolders);
      setFolders(uniqueFolders);
    } catch (error) {
      setFolderError(getFriendlyErrorMessage(error));
    } finally {
      setLoadingFolders(false);
    }
  };

  const currentFolder = typeof folders[activeTab] === 'string' ? folders[activeTab] : '';
  const canUpload = folders.length > 0 && !!currentFolder;

  const closePreview = () => setPreview({ open: false, file: null, folder: '' });

  const handlePreviewFile = async (file) => {
    const extension = file?.originalName?.split('.').pop()?.toLowerCase();
    const isPdf = extension === 'pdf';
    const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

    if (isMobile && isPdf) {
      const popup = window.open('', '_blank');
      if (popup) {
        popup.document.title = file.originalName || 'PDF';
        popup.document.body.innerHTML = '<p style="font-family: sans-serif; padding: 16px;">Se încarcă PDF-ul...</p>';
      }

      try {
        const blob = await UploadService.fetchPreviewBlob(file.fileName, currentFolder);
        const url = URL.createObjectURL(blob);

        if (popup) {
          popup.location.href = url;
        } else {
          window.location.href = url;
        }
        return;
      } catch (error) {
        if (popup && !popup.closed) {
          popup.close();
        }
        setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
        return;
      }
    }

    setPreview({ open: true, file, folder: currentFolder });
  };

  const canPreviewFile = (file) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'];
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpeg', 'mpg', 'ogv', '3gp', '3g2', 'ts', 'm2ts', 'wmv', 'flv', 'asf', 'mxf'];
    const extension = file?.originalName?.split('.').pop()?.toLowerCase();

    if (!extension) return false;
    if (file?.image) return true;
    if (extension === 'pdf') return true;

    return imageExtensions.includes(extension)
      || audioExtensions.includes(extension)
      || videoExtensions.includes(extension);
  };

  const openDeleteFileDialog = (file) => {
    setFileDeleteDialog({ open: true, file, folder: currentFolder });
  };

  const closeDeleteFileDialog = () => {
    setFileDeleteDialog({ open: false, file: null, folder: '' });
  };

  const handleDeleteFile = async () => {
    if (!isAdmin) {
      closeDeleteFileDialog();
      return;
    }

    const targetFile = fileDeleteDialog.file;
    const targetFolder = fileDeleteDialog.folder;
    if (!targetFile?.fileName) return;

    try {
      await UploadService.delete(targetFile.fileName, targetFolder);
      setSnackbar({ open: true, message: 'Fișier șters!', severity: 'success' });
      await loadFiles(targetFolder);
      closeDeleteFileDialog();
    } catch (error) {
      setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
    }
  };

  const handleDownloadFile = async (file) => {
    if (!file?.fileName) return;

    try {
      const blob = await UploadService.fetchDownloadBlob(file.fileName, currentFolder);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName || file.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
    }
  };

  // Folder actions
  const handleCreateFolder = async (name) => {
    try {
      await UploadService.createFolder(name);
      setSnackbar({ open: true, message: 'Folder creat!', severity: 'success' });
      await loadFolders();
    } catch (error) {
      setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
    }
  };
  const handleRenameFolder = async (oldName, newName) => {
    try {
      await UploadService.renameFolder(oldName, newName);
      setSnackbar({ open: true, message: 'Folder redenumit!', severity: 'success' });
      await loadFolders();
    } catch (error) {
      setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
    }
  };
  const handleDeleteFolder = async (name) => {
    try {
      await UploadService.deleteFolder(name);
      setSnackbar({ open: true, message: 'Folder șters!', severity: 'success' });
      await loadFolders();
    } catch (error) {
      setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={isMobile ? 'xs' : 'md'}
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Upload fișiere</span>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isAdmin && (
              <>
                <Tooltip title="Adaugă folder">
                  <span>
                    <IconButton onClick={() => setDialog({ open: true, type: 'create', value: '' })}>
                      <CreateNewFolderIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Redenumește folder">
                  <span>
                    <IconButton
                      disabled={!folders[activeTab]}
                      onClick={() => setDialog({ open: true, type: 'rename', value: folders[activeTab] || '' })}
                    >
                      <EditIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Șterge folder">
                  <span>
                    <IconButton
                      disabled={!folders[activeTab]}
                      onClick={() => setDialog({ open: true, type: 'delete', value: folders[activeTab] || '' })}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}
            <Tooltip title="Reîmprospătează">
              <span>
                <IconButton onClick={loadFolders} disabled={loadingFolders}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: isMobile ? 1.5 : 3, pb: isMobile ? 1.5 : 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {folderError && <Alert severity="error">{folderError}</Alert>}
          <Box
            sx={{
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 1
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ flex: 1, minHeight: isMobile ? 40 : 48 }}
            >
              {folders.map((folder, idx) => (
                <Tab key={folder} label={folder} />
              ))}
            </Tabs>
            <input
              type="file"
              style={{ display: 'none' }}
              id="upload-file-input"
              disabled={!canUpload || uploadProgress.active}
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const folderName = currentFolder;
                console.log('[DEBUG][FRONTEND] Upload folder trimis:', folderName);
                try {
                  setUploadProgress({ active: true, percent: 0, fileName: file.name || '' });
                  const uploadResult = await UploadService.upload(file, folderName, (percent) => {
                    setUploadProgress({ active: true, percent, fileName: file.name || '' });
                  });
                  console.log('[DEBUG][FRONTEND] UploadService.upload response:', uploadResult);
                  setSnackbar({ open: true, message: 'Fișier încărcat!', severity: 'success' });
                  await loadFolders();
                  await loadFiles(folderName);
                } catch (error) {
                  setSnackbar({ open: true, message: getFriendlyErrorMessage(error), severity: 'error' });
                } finally {
                  setUploadProgress({ active: false, percent: 0, fileName: '' });
                  e.target.value = '';
                }
              }}
            />
            <label htmlFor="upload-file-input">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadFileIcon />}
                fullWidth={isMobile}
                disabled={!canUpload || uploadProgress.active}
                sx={{ minWidth: isMobile ? '100%' : 'auto' }}
              >
                {uploadProgress.active ? 'Se încarcă...' : 'Upload fișier'}
              </Button>
            </label>
          </Box>
          {uploadProgress.active && (
            <Box sx={{ px: 0.5 }}>
              <Typography variant="body2" sx={{ mb: 0.75 }}>
                {uploadProgress.fileName
                  ? `Upload: ${uploadProgress.fileName} (${uploadProgress.percent}%)`
                  : `Upload în progres (${uploadProgress.percent}%)`}
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress.percent} />
            </Box>
          )}
          {/* File list for selected folder */}
          <List>
            {files.length > 0 ? (
              files.map((file) => {
                const isPreviewAvailable = canPreviewFile(file);
                const previewTooltip = isPreviewAvailable
                  ? 'Previzualizare'
                  : 'Acest tip de fișier nu se poate previzualiza, doar descarcă';

                return (
                <ListItem key={file.fileName} secondaryAction={
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={previewTooltip}>
                      <span>
                        <IconButton
                          onClick={() => handlePreviewFile(file)}
                          disabled={!isPreviewAvailable}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Descarcă">
                      <IconButton onClick={() => handleDownloadFile(file)}>
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    {isAdmin && (
                      <Tooltip title="Șterge">
                        <IconButton color="error" onClick={() => openDeleteFileDialog(file)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                }>
                  <ListItemText primary={file.originalName} />
                </ListItem>
              );})
            ) : (
              <ListItem>
                <ListItemText primary="Niciun fișier în acest folder" />
              </ListItem>
            )}
                {/* Modală previzualizare fișier cu fetch + blob */}
                {preview.open && (
                  <Dialog
                    open={preview.open}
                    onClose={closePreview}
                    maxWidth={isMobile ? 'xs' : 'md'}
                    fullWidth
                    fullScreen={isMobile}
                  >
                    <DialogContent sx={{ textAlign: 'center', px: isMobile ? 1.5 : 3 }}>
                      <PreviewFileContent file={preview.file} folder={preview.folder} />
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={closePreview} color="primary">Închide</Button>
                    </DialogActions>
                  </Dialog>
                )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Închide</Button>
      </DialogActions>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {dialog.open && (
        <Dialog
          open
          onClose={() => setDialog({ open: false, type: '', value: '' })}
          fullWidth={isMobile}
          maxWidth="xs"
        >
          <DialogTitle>
            {dialog.type === 'create' && 'Creează folder'}
            {dialog.type === 'rename' && 'Redenumește folder'}
            {dialog.type === 'delete' && 'Șterge folder'}
          </DialogTitle>
          <DialogContent>
            {(dialog.type === 'create' || dialog.type === 'rename') && (
              <input
                autoFocus
                style={{ width: '100%', padding: 8, fontSize: 16 }}
                placeholder={dialog.type === 'create' ? 'Nume folder nou' : 'Nume folder nou'}
                value={dialog.value}
                onChange={e => setDialog({ ...dialog, value: e.target.value })}
              />
            )}
            {dialog.type === 'delete' && (
              <Alert severity="warning">Sigur vrei să ștergi folderul <b>{dialog.value}</b>?</Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog({ open: false, type: '', value: '' })} color="inherit">Anulează</Button>
            {dialog.type === 'create' && (
              <Button
                onClick={async () => {
                  await handleCreateFolder(dialog.value);
                  setDialog({ open: false, type: '', value: '' });
                }}
                disabled={!dialog.value.trim()}
                variant="contained"
                color="primary"
              >Creează</Button>
            )}
            {dialog.type === 'rename' && (
              <Button
                onClick={async () => {
                  await handleRenameFolder(folders[activeTab], dialog.value);
                  setDialog({ open: false, type: '', value: '' });
                }}
                disabled={!dialog.value.trim() || dialog.value === folders[activeTab]}
                variant="contained"
                color="primary"
              >Redenumește</Button>
            )}
            {dialog.type === 'delete' && (
              <Button
                onClick={async () => {
                  await handleDeleteFolder(dialog.value);
                  setDialog({ open: false, type: '', value: '' });
                }}
                variant="contained"
                color="error"
              >Șterge</Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {fileDeleteDialog.open && (
        <Dialog open onClose={closeDeleteFileDialog} fullWidth={isMobile} maxWidth="xs">
          <DialogTitle>Șterge fișier</DialogTitle>
          <DialogContent>
            <Alert severity="warning">
              Sigur vrei să ștergi fișierul <b>{fileDeleteDialog.file?.originalName || fileDeleteDialog.file?.fileName}</b>?
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteFileDialog} color="inherit">Anulează</Button>
            <Button onClick={handleDeleteFile} variant="contained" color="error">Șterge</Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
};

export default UploadModal;

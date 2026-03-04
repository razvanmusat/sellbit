import { useState, useEffect } from 'react';
import { UploadService } from '../../shared/api/UploadService';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

export function useUploadModal(open, isAdmin) {
  const [preview, setPreview] = useState({ open: false, file: null, folder: '' });
  const [fileDeleteDialog, setFileDeleteDialog] = useState({ open: false, file: null, folder: '' });
  const [fileDownloadDialog, setFileDownloadDialog] = useState({ open: false, file: null, folder: '' });
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [uploadProgress, setUploadProgress] = useState({ active: false, percent: 0, fileName: '' });
  const [downloadProgress, setDownloadProgress] = useState({ active: false, percent: 0, fileName: '', indeterminate: false });
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
    } catch (error) {
      setFiles([]);
    }
  };

  const loadFolders = async () => {
    setLoadingFolders(true);
    setFolderError('');
    try {
      const result = await UploadService.listFolders();
      const uniqueFolders = Array.from(
        new Set(
          result.filter(
            f => typeof f === 'string' && f.trim() && f !== '.chunks'
          )
        )
      );
      setFolders(uniqueFolders);
    } catch (error) {
      setFolderError(getFriendlyErrorMessage(error));
    } finally {
      setLoadingFolders(false);
    }
  };

  return {
    preview, setPreview,
    fileDeleteDialog, setFileDeleteDialog,
    fileDownloadDialog, setFileDownloadDialog,
    files, setFiles,
    folders, setFolders,
    activeTab, setActiveTab,
    loadingFolders, setLoadingFolders,
    folderError, setFolderError,
    snackbar, setSnackbar,
    uploadProgress, setUploadProgress,
    downloadProgress, setDownloadProgress,
    dialog, setDialog,
    loadFiles,
    loadFolders
  };
}

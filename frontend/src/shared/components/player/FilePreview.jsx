import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PreviewFileContent from '../layout/PreviewFileContent';
import { PLAYER_FOLDER } from '../../hooks/usePlayer';

// Iconița de previzualizare (cu tooltip). file = fișierul din bibliotecă; fără file e dezactivată.
// Se folosește împreună cu FilePreviewDialog, pus ca soră (nu copil) a elementelor cu onClick, ca să nu se propage click-urile.
export const PreviewIconButton = ({ file, onOpen, size = 'small' }) => (
  <Tooltip title="Previzualizare" placement="top">
    <span>
      <IconButton
        size={size}
        aria-label="Previzualizare"
        disabled={!file}
        onClick={(event) => {
          event.stopPropagation();
          onOpen(file);
        }}
      >
        <VisibilityIcon fontSize={size === 'small' ? 'small' : 'medium'} />
      </IconButton>
    </span>
  </Tooltip>
);

// Aceeași modală de previzualizare ca la „Fișiere încărcate” (PreviewFileContent), pe folderul player.
export const FilePreviewDialog = ({ file, onClose }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  if (!file) return null;
  return (
    <Dialog open onClose={onClose} maxWidth={isMobile ? 'xs' : 'md'} fullWidth fullScreen={isMobile}>
      <DialogContent sx={{ textAlign: 'center', px: isMobile ? 1.5 : 3 }}>
        <PreviewFileContent file={file} folder={PLAYER_FOLDER} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">Închide</Button>
      </DialogActions>
    </Dialog>
  );
};

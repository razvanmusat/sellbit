import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FilePickerDialog from './FilePickerDialog';
import { FilePreviewDialog, PreviewIconButton } from './FilePreview';
import { fileLabel, shortName } from './playerUtils';

// Câmp care arată fișierul ales; la click se deschide modala „Alege fișier”.
// În câmp, la dreapta, apar doar iconițe (cu tooltip): alege din foldere, iar opțional adaugă fișier (onAdd) și
// scoate fișierul (onRemove, dezactivat cu removeDisabled). allowEmpty: buton de golire (ex. poza de fundal).
// inputStyle: stil pentru textul afișat. data-file = numele stocat, pentru teste.
const FilePickerField = ({
  label, value, library, onChange, imagesOnly = false, allowEmpty = false, inputStyle,
  onAdd, onRemove, removeDisabled = false, removeTitle = 'Scoate fișierul', sx,
}) => {
  const [open, setOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const file = library.files.find((item) => item.fileName === value);
  const display = !value ? '' : (file ? fileLabel(file) : `${shortName(value)} (lipsește din folder)`);

  return (
    <>
      <TextField
        size="small"
        label={label}
        value={display}
        placeholder="Alege fișier"
        onClick={() => setOpen(true)}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { 'data-file': value || '', readOnly: true, style: { cursor: 'pointer', ...inputStyle } },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                {allowEmpty && value && (
                  <Tooltip title="Fără poză">
                    <IconButton
                      size="small"
                      aria-label="Golește"
                      onClick={(event) => {
                        event.stopPropagation();
                        onChange('');
                      }}
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {onAdd && (
                  <Tooltip title="Adaugă fișier">
                    <IconButton
                      size="small"
                      aria-label="Adaugă fișier"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAdd();
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Alege din foldere">
                  <IconButton
                    size="small"
                    aria-label="Alege din foldere"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpen(true);
                    }}
                  >
                    <FolderOpenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {value && <PreviewIconButton file={file} onOpen={setPreviewFile} />}
                {onRemove && (
                  <Tooltip title={removeTitle}>
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Scoate fișierul"
                        disabled={removeDisabled}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemove();
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: 200, flex: 1, cursor: 'pointer', ...sx }}
      />
      <FilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
      {open && (
        <FilePickerDialog
          open
          onClose={() => setOpen(false)}
          onSelect={(fileName) => {
            onChange(fileName);
            setOpen(false);
          }}
          library={library}
          imagesOnly={imagesOnly}
          currentValue={value}
        />
      )}
    </>
  );
};

export default FilePickerField;

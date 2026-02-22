import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useCompanySettingsPage } from '../hooks/useCompanySettingsPage';

const COMPANY_FIELDS = [
  { key: 'name', label: 'Denumire companie', required: true },
  { key: 'vatNumber', label: 'CUI / CIF', required: true },
  { key: 'registrationNumber', label: 'Nr. Reg. Comerț', required: true },
  { key: 'phone', label: 'Telefon', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'bankAccount', label: 'Cont bancar (IBAN)' },
  { key: 'address', label: 'Adresă', required: true, multiline: true },
];

const CompanySettingsPage = () => {
  const {
    form,
    loading,
    saving,
    isConfigured,
    saveAll,
    saveField,
    snackbar,
    closeSnackbar,
    reload,
  } = useCompanySettingsPage();
  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState('');
  const [editAll, setEditAll] = useState(false);
  const [editAllForm, setEditAllForm] = useState(form);

  const startEditAll = () => {
    setEditAllForm(form);
    setEditAll(true);
    setEditingField(null);
    setDraftValue('');
  };

  const cancelEditAll = () => {
    setEditAll(false);
    setEditAllForm(form);
  };

  const handleSaveAll = async () => {
    const wasConfigured = isConfigured;
    const saved = await saveAll(editAllForm);
    if (saved) {
      setEditAll(false);
      if (!wasConfigured) {
        closeSnackbar();
        await reload();
      }
    }
  };

  const openEdit = (field) => {
    setEditingField(field);
    setDraftValue(form[field] || '');
  };

  const closeEdit = () => {
    setEditingField(null);
    setDraftValue('');
  };

  const handleSaveField = async () => {
    if (!editingField) return;
    const saved = await saveField(editingField, draftValue);
    if (saved) {
      closeEdit();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {!isConfigured && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Alert severity="info" sx={{ flex: 1 }}>
            Completează câmpurile obligatorii și salvează-le. La prima configurare, backend-ul validează toate câmpurile obligatorii.
          </Alert>
          {!editAll && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={startEditAll}
              disabled={saving}
            >
              Editare completa
            </Button>
          )}
          {editAll && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<CheckIcon />}
                onClick={handleSaveAll}
                disabled={saving}
              >
                Salveaza
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloseIcon />}
                onClick={cancelEditAll}
                disabled={saving}
              >
                Renunta
              </Button>
            </Box>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {COMPANY_FIELDS.map((field) => {
          const isEditing = editAll || editingField === field.key;
          const currentValue = form[field.key] || '';
          const value = currentValue || '-';
          const editValue = editAll ? editAllForm[field.key] ?? '' : draftValue;
          const isMultiline = Boolean(field.multiline);

          return (
            <Box
              key={field.key}
              sx={{
                bgcolor: '#fff',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                height: 54,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {isEditing ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', minWidth: 180, fontWeight: 500 }}
                    >
                      {field.label}{field.required ? ' *' : ''}:
                    </Typography>
                    <TextField
                      value={editValue}
                      onChange={(e) => {
                        if (editAll) {
                          setEditAllForm((prev) => ({ ...prev, [field.key]: e.target.value }));
                          return;
                        }
                        setDraftValue(e.target.value);
                      }}
                      fullWidth
                      size="small"
                      autoFocus
                      multiline={isMultiline}
                      minRows={isMultiline ? 1 : 1}
                      maxRows={isMultiline ? 3 : undefined}
                      sx={{
                        '& .MuiInputBase-root': {
                          minHeight: 34,
                          alignItems: 'center',
                        },
                        '& .MuiInputBase-input': {
                          padding: isMultiline ? '6px 12px' : '6px 12px',
                          lineHeight: '22px',
                        },
                        '& .MuiInputBase-inputMultiline': {
                          padding: '6px 12px',
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', minWidth: 180, fontWeight: 500 }}
                    >
                      {field.label}{field.required ? ' *' : ''}:
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: '#000',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {value}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {editAll ? null : isEditing ? (
                  <>
                    <IconButton color="primary" onClick={handleSaveField} disabled={saving}>
                      <CheckIcon />
                    </IconButton>
                    <IconButton color="inherit" onClick={closeEdit} disabled={saving}>
                      <CloseIcon />
                    </IconButton>
                  </>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => openEdit(field.key)}
                    disabled={saving || Boolean(editingField)}
                  >
                    Editează
                  </Button>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>

      <Snackbar
        open={snackbar.open}
        onClose={closeSnackbar}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompanySettingsPage;

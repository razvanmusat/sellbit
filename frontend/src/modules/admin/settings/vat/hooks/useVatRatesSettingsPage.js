import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';
import { VatRatesService } from '../api/VatRatesService';

const INITIAL_FORM = {
  id: null,
  code: '',
  label: '',
  rate: '',
  isActive: true,
};

const normalizeVatRate = (item) => ({
  ...item,
  isActive: item?.isActive ?? item?.active ?? false,
});

export const useVatRatesSettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [snackbar, setSnackbar] = useState({ open: false, severity: 'success', message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, item: null });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await VatRatesService.getAll();
      setItems((data || []).map(normalizeVatRate));
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCreate = () => {
    setForm(INITIAL_FORM);
    setOpenForm(true);
  };

  const handleOpenEdit = (item) => {
    setForm({
      id: item.id,
      code: item.code || '',
      label: item.label || '',
      rate: item.rate ?? '',
      isActive: item.isActive,
    });
    setOpenForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setOpenForm(false);
    setForm(INITIAL_FORM);
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.code?.trim() || !form.label?.trim() || form.rate === '') {
      setSnackbar({ open: true, severity: 'warning', message: 'Completează cod, denumire și cotă TVA.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        rate: Number(form.rate),
        active: form.isActive,
      };

      if (form.id) {
        await VatRatesService.update(form.id, payload);
      } else {
        await VatRatesService.create(payload);
      }

      await load();
      closeForm();
      setSnackbar({ open: true, severity: 'success', message: 'Cota TVA a fost salvată.' });
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (item) => {
    setSaving(true);
    try {
      await VatRatesService.deactivate(item.id);
      await load();
      setSnackbar({ open: true, severity: 'success', message: 'Cota TVA a fost dezactivată.' });
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const handleReactivate = async (item) => {
    setSaving(true);
    try {
      await VatRatesService.update(item.id, {
        code: item.code,
        label: item.label,
        rate: item.rate,
        active: true,
      });
      await load();
      setSnackbar({ open: true, severity: 'success', message: 'Cota TVA a fost reactivată.' });
    } catch (error) {
      setSnackbar({ open: true, severity: 'error', message: getFriendlyErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const requestDeactivate = (item) => {
    setConfirmDialog({ open: true, type: 'deactivate', item });
  };

  const requestReactivate = (item) => {
    setConfirmDialog({ open: true, type: 'reactivate', item });
  };

  const closeConfirmDialog = () => {
    if (saving) return;
    setConfirmDialog({ open: false, type: null, item: null });
  };

  const confirmAction = async () => {
    if (!confirmDialog.item) return;
    if (confirmDialog.type === 'deactivate') {
      await handleDeactivate(confirmDialog.item);
    } else if (confirmDialog.type === 'reactivate') {
      await handleReactivate(confirmDialog.item);
    }
    setConfirmDialog({ open: false, type: null, item: null });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return {
    loading,
    saving,
    sortedItems,
    openForm,
    form,
    snackbar,
    handleOpenCreate,
    handleOpenEdit,
    closeForm,
    setField,
    handleSave,
    requestDeactivate,
    requestReactivate,
    confirmDialog,
    closeConfirmDialog,
    confirmAction,
    closeSnackbar,
  };
};

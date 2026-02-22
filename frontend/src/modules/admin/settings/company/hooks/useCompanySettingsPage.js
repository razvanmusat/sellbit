import { useCallback, useEffect, useState } from 'react';
import { StoreService } from '../api/StoreService';
import { getFriendlyErrorMessage } from '../../../../../shared/utils/errorHandler';

const INITIAL_FORM = {
  name: '',
  address: '',
  phone: '',
  email: '',
  vatNumber: '',
  registrationNumber: '',
  bankAccount: '',
};

export const useCompanySettingsPage = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: 'success',
    message: '',
  });

  const mapStoreToForm = (data) => ({
    name: data?.name || '',
    address: data?.address || '',
    phone: data?.phone || '',
    email: data?.email || '',
    vatNumber: data?.vatNumber || '',
    registrationNumber: data?.registrationNumber || '',
    bankAccount: data?.bankAccount || '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const configured = await StoreService.isConfigured();
      setIsConfigured(Boolean(configured));

      if (configured) {
        const data = await StoreService.getStore();
        setForm(mapStoreToForm(data));
      } else {
        setForm(INITIAL_FORM);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getFriendlyErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveAll = async (payload) => {
    setSaving(true);
    try {
      const saved = await StoreService.saveOrUpdateStore(payload);
      setForm(mapStoreToForm(saved));
      setIsConfigured(true);
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Datele companiei au fost salvate cu succes.',
      });
      return true;
    } catch (error) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getFriendlyErrorMessage(error),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async () => saveAll(form);

  const saveField = async (field, value) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        [field]: value,
      };
      const saved = await StoreService.saveOrUpdateStore(payload);
      setForm(mapStoreToForm(saved));
      setIsConfigured(true);
      setSnackbar({
        open: true,
        severity: 'success',
        message: 'Câmpul a fost actualizat.',
      });
      return true;
    } catch (error) {
      setSnackbar({
        open: true,
        severity: 'error',
        message: getFriendlyErrorMessage(error),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return {
    form,
    loading,
    saving,
    isConfigured,
    setField,
    save,
    saveAll,
    saveField,
    snackbar,
    closeSnackbar,
    reload: load,
  };
};

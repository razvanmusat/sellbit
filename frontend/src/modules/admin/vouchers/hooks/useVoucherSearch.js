import { useCallback, useState } from 'react';
import { CustomerVoucherService } from '../api/CustomerVoucherService';
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

export const useVoucherSearch = () => {
  const [prefix, setPrefix] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateCode = useCallback(async (activePrefixes) => {
    const suffix = code.trim().toUpperCase();
    if (!suffix) {
      throw new Error('Introdu un cod de voucher.');
    }
    if (activePrefixes.length > 1 && !prefix) {
      throw new Error('Selecteaza un prefix de campanie.');
    }

    const prefixValue = (prefix || '').trim();
    const normalizedPrefix = prefixValue ? prefixValue.replace(/-+$/g, '') : '';
    const fullCode = normalizedPrefix ? `${normalizedPrefix}-${suffix}` : suffix;
    
    setLoading(true);
    try {
      const data = await CustomerVoucherService.validate(fullCode);
      setResult(data || null);
      return data;
    } catch (error) {
      setResult(null);
      throw new Error(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [prefix, code]);

  const reactivateVoucher = useCallback(async (voucherCode) => {
    await CustomerVoucherService.reactivate(voucherCode);
    if (voucherCode) {
      try {
        const data = await CustomerVoucherService.validate(voucherCode);
        setResult(data || null);
      } catch {
        setResult(null);
      }
    }
  }, []);

  const deactivateVoucher = useCallback(async (voucherCode) => {
    await CustomerVoucherService.consume(voucherCode);
    if (voucherCode) {
      try {
        const data = await CustomerVoucherService.validate(voucherCode);
        setResult(data || null);
      } catch {
        setResult(null);
      }
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    prefix,
    setPrefix,
    code,
    setCode,
    result,
    loading,
    validateCode,
    reactivateVoucher,
    deactivateVoucher,
    clearResult,
  };
};

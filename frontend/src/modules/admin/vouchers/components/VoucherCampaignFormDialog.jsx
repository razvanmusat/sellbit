import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  FormHelperText,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  MenuItem,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ro';
import ProductSearch from '../../../cashier/sales/components/common/ProductSearch';

const VoucherCampaignFormDialog = ({
  open,
  onClose,
  onSave,
  saving,
  form,
  setField,
  activePrefixes,
}) => {
  const discountValueHint = () => {
    if (form.discountType === 'PERCENT') return 'Pentru procent introduci doar numarul (fara %).';
    if (form.discountType === 'FREE_HOURS') return 'Numarul de ore gratuite oferite.';
    return 'Valoarea fixa in lei.';
  };

  const handleSelectRequiredProduct = (product) => {
    setField('requiredProductId', product?.id ?? '');
    setField('requiredProductName', product?.name ?? '');
  };

  const handleSelectApplicableProduct = (product) => {
    setField('applicableProductId', product?.id ?? '');
    setField('applicableProductName', product?.name ?? '');
  };

  const clearRequiredProduct = () => {
    setField('requiredProductId', '');
    setField('requiredProductName', '');
  };

  const clearApplicableProduct = () => {
    setField('applicableProductId', '');
    setField('applicableProductName', '');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle>
          {form.isReactivating ? 'Reactivare Campanie Expirata' : 'Campanie noua de vouchere'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {form.isReactivating && (
              <Alert severity="warning">
                Campania a expirat. Selecteaza o noua perioada pentru reactivare. Datele trebuie sa fie diferite de cea anterioara ({dayjs(form.oldValidFromDate).format('DD/MM/YYYY')} - {dayjs(form.oldValidUntilDate).format('DD/MM/YYYY')})
              </Alert>
            )}
            <TextField
              label="Denumire"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              fullWidth
              size="small"
              autoComplete="off"
              slotProps={{ htmlInput: { autoComplete: 'off' } }}
              helperText="Denumirea campaniei pentru identificare interna."
              required
            />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <DatePicker
                label="Data start"
                format="DD/MM/YYYY"
                value={form.validFromDate ? dayjs(form.validFromDate) : null}
                onChange={(value) => setField('validFromDate', value ? value.format('YYYY-MM-DD') : '')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    autoComplete: 'off',
                    helperText: form.isReactivating 
                      ? `Data de inceput. Anterior era: ${dayjs(form.oldValidFromDate).format('DD/MM/YYYY')}`
                      : 'Data de inceput a campaniei (zz/ll/aaaa).',
                    required: true,
                  },
                }}
              />
              <DatePicker
                label="Data final"
                format="DD/MM/YYYY"
                value={form.validUntilDate ? dayjs(form.validUntilDate) : null}
                onChange={(value) => setField('validUntilDate', value ? value.format('YYYY-MM-DD') : '')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: 'small',
                    autoComplete: 'off',
                    helperText: form.isReactivating
                      ? `Data de final. Anterior era: ${dayjs(form.oldValidUntilDate).format('DD/MM/YYYY')}`
                      : 'Data de final a campaniei (zz/ll/aaaa).',
                    required: true,
                  },
                }}
              />
              <TextField
                label="Suma minima (lei)"
                type="number"
                value={form.minAmount}
                onChange={(e) => setField('minAmount', e.target.value)}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { step: '0.01', min: '0', autoComplete: 'off' } }}
                helperText="Suma minima a bonului total pentru emitere."
                required
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                select
                label="Tip discount"
                value={form.discountType}
                onChange={(e) => setField('discountType', e.target.value)}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
                helperText="Tipul reducerii oferite de voucher."
                required
              >
                <MenuItem value="PERCENT">Procent</MenuItem>
                <MenuItem value="FIXED">Suma fixa</MenuItem>
                <MenuItem value="FREE_HOURS">Ore gratuite</MenuItem>
              </TextField>
              <TextField
                label="Valoare"
                type="number"
                value={form.discountValue}
                onChange={(e) => setField('discountValue', e.target.value)}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { step: '0.01', min: '0', autoComplete: 'off' } }}
                helperText={discountValueHint()}
                required
              />
              {form.discountType === 'PERCENT' && (
                <TextField
                  label="Suma maxima discount (lei)"
                  type="number"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setField('maxDiscountAmount', e.target.value)}
                  fullWidth
                  size="small"
                  autoComplete="off"
                  slotProps={{ htmlInput: { step: '0.01', min: '0', autoComplete: 'off' } }}
                  helperText="Suma maxima pe care o poate ajunge discountul in lei (ex: 10% dar max 50 lei)."
                  required
                />
              )}
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                {form.requiredProductId ? (
                  <TextField
                    value={form.requiredProductName || `#${form.requiredProductId}`}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={clearRequiredProduct} size="small" color="error">
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                ) : (
                  <ProductSearch
                    onProductSelect={handleSelectRequiredProduct}
                    onlyTrackStock={false}
                    showPrice={false}
                    showStock={false}
                  />
                )}
                <FormHelperText>
                  Produs obligatoriu pe bon pentru emiterea voucherului (optional).
                </FormHelperText>
              </Box>
              <Box sx={{ flex: 1 }}>
                {form.applicableProductId ? (
                  <TextField
                    value={form.applicableProductName || `#${form.applicableProductId}`}
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        readOnly: true,
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={clearApplicableProduct} size="small" color="error">
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                ) : (
                  <ProductSearch
                    onProductSelect={handleSelectApplicableProduct}
                    onlyTrackStock={false}
                    showPrice={false}
                    showStock={false}
                  />
                )}
                <FormHelperText>
                  Produs pe care se aplica reducerea (ex: voucher de o ora se aplica pe acel produs).
                </FormHelperText>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Valabilitate voucher (zile)"
                type="number"
                value={form.validDays}
                onChange={(e) => setField('validDays', e.target.value)}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { min: '1', autoComplete: 'off' } }}
                helperText="Numarul de zile in care voucherul ramane valid dupa emitere."
                required
              />
              <TextField
                label="Zile aplicabile (1-7)"
                value={form.applicableDays}
                onChange={(e) => setField('applicableDays', e.target.value)}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
                helperText="Format: 1,3,5 (1=Luni ... 7=Duminica)."
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Prefix cod"
                value={form.prefix}
                onChange={(e) => setField('prefix', e.target.value.toUpperCase())}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
                helperText="Doar litere mari si cifre."
              />
              <TextField
                label="Lungime cod"
                type="number"
                value={form.codeLength}
                onChange={(e) => setField('codeLength', e.target.value)}
                fullWidth
                size="small"
                autoComplete="off"
                slotProps={{ htmlInput: { min: '3', max: '20', autoComplete: 'off' } }}
                helperText="Ex: 4"
              />
              <TextField
                label="Notite pe bon (optional)"
                value={form.receiptTemplate}
                onChange={(e) => setField('receiptTemplate', e.target.value)}
                multiline
                rows={2}
                fullWidth
                size="small"
                autoComplete="off"
                placeholder="Info campanie afisate pe bon (ex: instructiuni folosire voucher)"
                slotProps={{ htmlInput: { autoComplete: 'off' } }}
                helperText="Textul afisat pe bon pentru instructiuni despre voucher."
              />
            </Stack>

            {!!activePrefixes?.length && (
              <Box sx={{ mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Prefixe active: {activePrefixes.join(', ')}
                </Typography>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit" disabled={saving}>Anuleaza</Button>
          <Button onClick={onSave} variant="contained" disabled={saving}>
            {saving ? 'Se salveaza...' : 'Salveaza'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default VoucherCampaignFormDialog;

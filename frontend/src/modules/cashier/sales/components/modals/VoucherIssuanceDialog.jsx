import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Typography, Stack, Box, Divider, CircularProgress,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import StarsIcon from '@mui/icons-material/Stars';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import { VoucherCampaignService } from '../../../../admin/vouchers/api/VoucherCampaignService';
import {
  buildRegularVoucherBody,
  buildLoyaltyCardBody,
  buildLoyaltyCardHtml,
  printVoucherPages,
  printVoucherHtml,
} from '../../../../../shared/utils/printVoucher';


const buildBody = (v) => {
  if (v.campaignType === 'LOYALTY') {
    return buildLoyaltyCardBody({
      code: v.code,
      stampsRequired: v.stampsRequired,
      discountType: v.discountType,
      discountValue: v.discountValue,
      expiresAt: v.expiresAt,
      receiptTemplate: v.receiptTemplate,
    });
  }
  return buildRegularVoucherBody({
    code: v.code,
    discountType: v.discountType,
    discountValue: v.discountValue,
    expiresAt: v.expiresAt,
    receiptTemplate: v.receiptTemplate,
  });
};


const VoucherIssuanceDialog = ({ issuance, onDismiss, cashierId }) => {
  const { vouchers, loyaltyCampaign, receiptId } = issuance;
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const hasVouchers = vouchers?.length > 0;
  const hasLoyalty = !!loyaltyCampaign;

  const handlePrintVouchers = async () => {
    await printVoucherPages(vouchers.map(buildBody));
  };

  const handleIssueLoyaltyVoucher = async () => {
    setLoyaltyLoading(true);
    try {
      const issued = await VoucherCampaignService.issueLoyaltyVoucher(loyaltyCampaign.campaignId, receiptId);
      if (issued?.code) {
        printVoucherHtml(await buildLoyaltyCardHtml({
          code: issued.code,
          stampsRequired: issued.stampsRequired,
          discountType: issued.discountType,
          discountValue: issued.discountValue,
          expiresAt: issued.expiresAt,
          receiptTemplate: issued.receiptTemplate,
        }));
      }
      onDismiss();
    } catch {
      // silent — cashier can retry
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const handleAddStamp = async () => {
    setLoyaltyLoading(true);
    try {
      await VoucherCampaignService.addStamp(loyaltyCampaign.campaignId, cashierId ?? null, receiptId);
      onDismiss();
    } catch {
      // silent
    } finally {
      setLoyaltyLoading(false);
    }
  };

  if (hasVouchers) {
    return (
      <Dialog open fullWidth maxWidth="xs" disableEscapeKeyDown>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarsIcon color="warning" />
          Vouchere emise!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            S-au emis {vouchers.length} voucher{vouchers.length > 1 ? 'e' : ''} pentru acest bon.
            Printeaza-le pe cartonase 57x120mm.
          </Typography>
          <Stack spacing={1}>
            {vouchers.map((v) => (
              <Box key={v.id} sx={{ p: 1, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">{v.campaignName}</Typography>
                <Typography fontWeight={700} letterSpacing={2}>{v.code}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px', gap: 1 }}>
          <Button onClick={onDismiss} color="inherit">Închide fără print</Button>
          <Button onClick={handlePrintVouchers} variant="contained" startIcon={<PrintIcon />}>
            Printează {vouchers.length > 1 ? `(${vouchers.length})` : ''}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (hasLoyalty) {
    return (
      <Dialog open fullWidth maxWidth="xs" disableEscapeKeyDown>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LoyaltyIcon color="primary" />
          Card Fidelitate — {loyaltyCampaign.campaignName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={1}>
            Clientul este eligibil pentru campania de fidelitate.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Alege o actiune:
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<StarsIcon />}
              onClick={handleIssueLoyaltyVoucher}
              disabled={loyaltyLoading}
            >
              Voucher nou (prima vizita / card completat)
            </Button>
            <Button
              variant="outlined"
              fullWidth
              color="secondary"
              startIcon={loyaltyLoading ? <CircularProgress size={18} /> : <LoyaltyIcon />}
              onClick={handleAddStamp}
              disabled={loyaltyLoading}
            >
              Stampila pe card fizic
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={onDismiss} color="inherit" disabled={loyaltyLoading}>
            Sari peste
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return null;
};

VoucherIssuanceDialog.propTypes = {
  issuance: PropTypes.shape({
    vouchers: PropTypes.array,
    loyaltyCampaign: PropTypes.object,
    receiptId: PropTypes.number,
  }).isRequired,
  onDismiss: PropTypes.func.isRequired,
  cashierId: PropTypes.number,
};

export default VoucherIssuanceDialog;

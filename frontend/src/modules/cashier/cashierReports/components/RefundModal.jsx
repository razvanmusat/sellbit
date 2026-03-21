import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  IconButton,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

import { useRefundModal } from "../hooks/useRefundModal";

const RefundModal = ({ open, onClose, receipt, onRefundSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { state, setters, handlers } = useRefundModal(
    open,
    receipt,
    onClose,
    onRefundSuccess,
  );

  const {
    items,
    paymentMethods,
    originalPayments,
    loadingItems,
    submitting,
    toastOpen,
    toastMessage,
    toastSeverity,
    refundMap,
    paymentMethodId,
    refundNote,
    totalRefundAmount,
    hasSelection,
  } = state;

  const { setPaymentMethodId, setRefundNote } = setters;

  const {
    getRefundLimit,
    handleIncrement,
    handleDecrement,
    handleToggleCheck,
    handleSubmitRefund,
    handleCloseToast,
  } = handlers;

  // --- Tabel plăți originale ---
  const paymentsTable = (() => {
    if (!Array.isArray(originalPayments) || originalPayments.length === 0)
      return null;

    const warehouses = [
      ...new Map(
        originalPayments
          .filter((p) => p.warehouseId)
          .map((p) => [
            p.warehouseId,
            { id: p.warehouseId, name: p.warehouseName },
          ]),
      ).values(),
    ];

    if (warehouses.length === 0) return null;

    const methods = [
      ...new Map(
        originalPayments.map((p) => [
          p.paymentMethodCode,
          p.paymentMethodLabel || p.paymentMethodCode,
        ]),
      ).entries(),
    ];

    return (
      <Table size="small" sx={{ border: "1px solid #eee", borderRadius: 1 }}>
        <TableHead sx={{ bgcolor: "#f5f5f5" }}>
          <TableRow>
            <TableCell sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}>
              Plăți originale
            </TableCell>
            {warehouses.map((w) => (
              <TableCell
                key={w.id}
                align="right"
                sx={{ py: 0.5, fontWeight: "bold", fontSize: "0.75rem" }}
              >
                {w.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {methods.map(([code, label]) => {
            const rowValues = warehouses.map((w) =>
              originalPayments
                .filter(
                  (p) => p.paymentMethodCode === code && p.warehouseId === w.id,
                )
                .reduce((sum, p) => sum + p.amount, 0),
            );
            if (rowValues.every((v) => v === 0)) return null;
            return (
              <TableRow key={code}>
                <TableCell sx={{ py: 0.5, fontSize: "0.75rem" }}>
                  {label}
                </TableCell>
                {rowValues.map((val, idx) => (
                  <TableCell
                    key={idx}
                    align="right"
                    sx={{ py: 0.5, fontSize: "0.75rem" }}
                  >
                    {val !== 0 ? `${Math.abs(val).toFixed(2)} RON` : "—"}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  })();

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={isMobile}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle sx={{ borderBottom: "1px solid #eee", py: 1.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" component="span" sx={{ mr: 1 }}>
                Retur Produse - {receipt?.tableName || "Fără masă"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {receipt?.note ? `• Notițe: ${receipt.note}` : ""}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 1, sm: 3 } }}>
          {loadingItems ? (
            <Box display="flex" justifyContent="center" p={5}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} variant="outlined">
              <Table size="small" sx={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                  <col style={{ width: "50px" }} />
                  <col style={{ width: "auto" }} />
                  <col style={{ width: "120px" }} />
                  <col style={{ width: "140px" }} />
                  <col style={{ width: "100px" }} />
                </colgroup>
                <TableHead sx={{ bgcolor: "#f9f9f9" }}>
                  <TableRow>
                    <TableCell padding="checkbox">Select</TableCell>
                    <TableCell>Produs</TableCell>
                    <TableCell align="center">Gestiune</TableCell>
                    <TableCell align="center">Cantitate</TableCell>
                    <TableCell align="right">Preț</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(items) &&
                    items.map((item) => {
                      const limit = getRefundLimit(item);
                      const isFullyRefunded = limit <= 0;
                      const currentQty = refundMap[item.id] || 0;
                      const isSelected = currentQty > 0;

                      return (
                        <TableRow
                          key={item.id}
                          hover
                          selected={isSelected}
                          sx={{
                            opacity: isFullyRefunded ? 0.5 : 1,
                            bgcolor: isFullyRefunded ? "#fafafa" : "inherit",
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleToggleCheck(item)}
                              color="error"
                              disabled={isFullyRefunded}
                            />
                          </TableCell>

                          <TableCell sx={{ overflow: "hidden" }}>
                            <Box display="flex" flexDirection="column">
                              <Typography
                                variant="body2"
                                noWrap
                                fontWeight={isSelected ? "bold" : "normal"}
                              >
                                {item.productName}
                              </Typography>
                              <Box display="flex" gap={1} alignItems="center">
                                {isFullyRefunded ? (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "orange", fontWeight: "bold" }}
                                  >
                                    STORNAT COMPLET
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    Disponibil: <b>{limit}</b> / {item.quantity} buc
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {item.warehouseName || "—"}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDecrement(item)}
                                disabled={currentQty === 0}
                              >
                                <RemoveCircleOutlineIcon fontSize="small" />
                              </IconButton>
                              <Typography sx={{ width: 24, textAlign: "center", fontWeight: "bold" }}>
                                {currentQty}
                              </Typography>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleIncrement(item)}
                                disabled={currentQty >= limit || isFullyRefunded}
                              >
                                <AddCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>

                          <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            {isSelected
                              ? (item.unitPrice * currentQty).toFixed(2)
                              : "0.00"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>

        <Box sx={{ p: 2, borderTop: "1px solid #eee", display: "flex", flexDirection: "column", gap: 2 }}>

          {/* MOTIV RETUR */}
          <TextField
            label="Motiv retur (opțional)"
            placeholder="Ex: produs deteriorat, comandă greșită..."
            size="small"
            fullWidth
            multiline
            rows={1}
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
          />

          {/* Plăți originale + metodă restituire */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {paymentsTable || (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                  Necunoscute
                </Typography>
              )}
            </Box>

            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "300px" } }}>
              <InputLabel>Selectează metoda restituire</InputLabel>
              <Select
                value={paymentMethodId}
                label="Selectează metoda restituire"
                onChange={(e) => setPaymentMethodId(e.target.value)}
              >
                {Array.isArray(paymentMethods) &&
                  paymentMethods.map((method) => (
                    <MenuItem key={method.id} value={method.id}>
                      {method.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>

          {/* Total restituit */}
          <Box>
            <Typography variant="h6">
              Total Restituit:{" "}
              <span style={{ color: "red" }}>
                {totalRefundAmount.toFixed(2)} RON
              </span>
            </Typography>
          </Box>

          <DialogActions sx={{ p: 0, justifyContent: "flex-end" }}>
            <Button onClick={onClose} color="inherit">
              Anulează
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={
                submitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              disabled={!hasSelection || submitting || !paymentMethodId}
              onClick={handleSubmitRefund}
            >
              {submitting ? "Se procesează..." : "Confirmă Retur"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toastSeverity}
          variant="filled"
          sx={{ width: "100%", fontSize: "1rem", fontWeight: "bold", boxShadow: 3 }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RefundModal;
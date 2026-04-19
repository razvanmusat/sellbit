import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  CircularProgress,
  Snackbar,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import CategoryIcon from "@mui/icons-material/Category";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";

import ProductCard from "./ProductCard";
import ProductSearch from "../common/ProductSearch";
import ProductScanner from "../common/ProductScanner";
import { StockCurrentService } from "../../api/StockCurrentService";

const OpenedReceiptCard = ({
  receipt,
  warehouses,
  onBack,
  onAddPayment,
  onAddProduct,
  onUpdateItem,
  onRemoveItem,
  onCancelReceipt,
  editMode = false,
  stockMap = {},
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [stockSnackbar, setStockSnackbar] = useState(false);

  // Picker gestiune
  const [pendingProduct, setPendingProduct] = useState(null);
  const [warehousePickerOpen, setWarehousePickerOpen] = useState(false);

  // Stocuri per gestiune pentru produsul pending
  // { [warehouseId]: quantity | null (loading) }
  const [stockPerWarehouse, setStockPerWarehouse] = useState({});
  const [stockLoading, setStockLoading] = useState(false);

  // Când se deschide picker-ul, încărcăm stocul produsului pe fiecare gestiune
  useEffect(() => {
    if (!pendingProduct || !warehousePickerOpen) {
      setStockPerWarehouse({});
      return;
    }

    // Produse fără trackStock → nu facem call-uri
    if (pendingProduct.trackStock === false) return;

    setStockLoading(true);

    // Un call per gestiune — sunt max 3-4 gestiuni, e neglijabil
    Promise.all(
      warehouses.map((w) =>
        StockCurrentService.getProductStockLive(w.id, pendingProduct.id)
          .then((qty) => ({ warehouseId: w.id, qty: Number(qty) }))
          .catch(() => ({ warehouseId: w.id, qty: 0 })),
      ),
    )
      .then((results) => {
        const map = {};
        results.forEach(({ warehouseId, qty }) => {
          map[warehouseId] = qty;
        });
        setStockPerWarehouse(map);
      })
      .finally(() => setStockLoading(false));
  }, [pendingProduct, warehousePickerOpen, warehouses]);

  const handleTabChange = (event, newValue) => {
    if (newValue === 2) {
      const params = new URLSearchParams({
        receiptId: receipt.id,
        tableName: receipt.tableName,
      }).toString();
      navigate(`/sales/catalog?${params}`);
      return;
    }
    setCurrentTab(newValue);
  };

  const handleProductSelect = (product) => {
    if (warehouses.length === 1) {
      onAddProduct(product, warehouses[0].id);
      return;
    }
    setPendingProduct(product);
    setWarehousePickerOpen(true);
  };

  const handleWarehousePick = (warehouseId) => {
    if (pendingProduct) {
      onAddProduct(pendingProduct, warehouseId);
    }
    setPendingProduct(null);
    setWarehousePickerOpen(false);
    setStockPerWarehouse({});
  };

  const handlePickerClose = () => {
    setPendingProduct(null);
    setWarehousePickerOpen(false);
    setStockPerWarehouse({});
  };

  const handleMoveToWarehouse = async (
    receiptItemId,
    productId,
    quantity,
    newWarehouseId,
  ) => {
    await onRemoveItem(receiptItemId);
    onAddProduct({ id: productId }, newWarehouseId, quantity);
  };

  const items = (receipt.items || [])
    .filter((item) => item != null)
    .slice()
    .sort((a, b) => (a.receiptItemId || 0) - (b.receiptItemId || 0));

  // Headroom per gestiune = items_W - payments_W.
  // O linie pe W poate fi redusă/ștearsă/mutată doar cât timp
  // după operație rămâne items_W >= payments_W.
  const headroomPerWarehouse = useMemo(() => {
    const paid = {};
    (receipt.payments || []).forEach((p) => {
      if (p.warehouseId) {
        paid[p.warehouseId] = (paid[p.warehouseId] || 0) + (p.amount || 0);
      }
    });
    const totals = {};
    (receipt.items || []).forEach((i) => {
      if (i && i.warehouseId) {
        totals[i.warehouseId] = (totals[i.warehouseId] || 0) + (i.lineTotal || 0);
      }
    });
    const map = {};
    Object.keys(totals).forEach((whId) => {
      map[whId] = {
        items: totals[whId] || 0,
        payments: paid[whId] || 0,
        headroom: (totals[whId] || 0) - (paid[whId] || 0),
      };
    });
    return map;
  }, [receipt.items, receipt.payments]);

  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 1, sm: 2 },
        display: "flex",
        flexDirection: "column",
        height: "85vh",
        maxHeight: "100%",
        borderRadius: { xs: 0, sm: 2 },
      }}
    >
      {/* --- HEADER --- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 1,
          borderBottom: 1,
          borderColor: "divider",
          pb: 1,
        }}
      >
        <IconButton onClick={onBack} size={isSmallScreen ? "small" : "medium"}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ ml: 1, flex: 1, minWidth: 0 }}>
          <Typography
            variant={isSmallScreen ? "h6" : "h5"}
            fontWeight="bold"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {receipt.tableName}
            {receipt.note && receipt.note.trim() !== "" && (
              <span
                style={{
                  fontWeight: "normal",
                  fontStyle: "italic",
                  color: "#888",
                  marginLeft: 12,
                }}
              >
                &nbsp;| Notă: {receipt.note}
              </span>
            )}
          </Typography>
        </Box>
        {!editMode && (
          <IconButton
            onClick={onCancelReceipt}
            color="error"
            size={isSmallScreen ? "small" : "medium"}
            sx={{ border: "1px solid rgba(211, 47, 47, 0.3)", ml: 1 }}
          >
            <DeleteForeverIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* --- TABS --- */}
      {!editMode && (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab
              icon={<SearchIcon />}
              label={isSmallScreen ? "Caută" : "Căutare"}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab
              icon={<QrCodeScannerIcon />}
              label={isSmallScreen ? "Scan" : "Scanare"}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
            <Tab
              icon={<CategoryIcon />}
              label={isSmallScreen ? "Categ" : "Categorii"}
              iconPosition="start"
              sx={{ minHeight: 48 }}
            />
          </Tabs>
        </Box>
      )}

      {/* --- ZONA ACTIVĂ --- */}
      {!editMode && (
        <Box sx={{ my: 2, position: "relative", zIndex: 10 }}>
          {currentTab === 0 && (
            <ProductSearch
              onProductSelect={handleProductSelect}
              warehouses={warehouses}
            />
          )}
          {currentTab === 1 && (
            <ProductScanner onProductSelect={handleProductSelect} />
          )}
          {currentTab === 2 && (
            <Typography
              sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
            >
              Se încarcă catalogul...
            </Typography>
          )}
        </Box>
      )}

      {/* --- LISTA PRODUSE --- */}
      {editMode ? (
        <Box sx={{ flex: 1, overflowY: "auto", my: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem" }}>PRODUS</TableCell>
                <TableCell sx={{ fontWeight: "bold", fontSize: "0.75rem", width: 140 }}>GESTIUNE</TableCell>
                <TableCell align="center" sx={{ fontWeight: "bold", fontSize: "0.75rem", width: 60 }}>CANT.</TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", fontSize: "0.75rem", width: 90 }}>PREȚ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={`${item.receiptItemId}-${item.productId}`} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{item.name || "Produs invalid"}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      fullWidth
                      value={item.warehouseId || ""}
                      onChange={(e) => handleMoveToWarehouse(item.receiptItemId, item.productId, item.quantity, e.target.value)}
                      sx={{ fontSize: "0.8rem" }}
                    >
                      {warehouses.map((w) => {
                        const stock = stockMap[`${item.productId}_${w.id}`];
                        const isCurrent = w.id === item.warehouseId;
                        const outOfStock = item.trackStock && !isCurrent && (stock == null || stock <= 0);
                        const stockLabel = !item.trackStock
                          ? "∞"
                          : stock == null
                            ? "—"
                            : Number(stock).toLocaleString("ro-RO", { maximumFractionDigits: 2 });
                        return (
                          <MenuItem
                            key={w.id}
                            value={w.id}
                            disabled={outOfStock}
                            sx={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between", gap: 1 }}
                          >
                            <span>{w.name}</span>
                            <span style={{
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                              color: outOfStock ? "#d32f2f" : item.trackStock ? "#2e7d32" : "#888",
                            }}>
                              {stockLabel}
                            </span>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>{item.quantity}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}>
                    {(item.lineTotal || 0).toFixed(2)} RON
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            scrollbarGutter: "stable",
            my: 1,
            pr: 0.5,
            bgcolor: items.length === 0 ? "rgba(0,0,0,0.02)" : "transparent",
            borderRadius: 1,
          }}
        >
          {items.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="text.secondary">
              <Typography variant="body1">Bonul este gol.</Typography>
              <Typography variant="caption">Caută sau scanează un produs.</Typography>
            </Box>
          ) : (
            items.map((item) => {
              const wh = headroomPerWarehouse[item.warehouseId];
              const headroom = wh ? wh.headroom : Infinity;
              const paidOnWh = wh ? wh.payments : 0;
              const lineTotal = item.lineTotal || 0;
              const unitPrice = item.quantity > 0 ? lineTotal / item.quantity : 0;
              const EPS = 0.001;
              const canChangeWarehouse = paidOnWh === 0 || lineTotal <= headroom + EPS;
              const canDecrement = paidOnWh === 0 || unitPrice <= headroom + EPS;
              const canRemove = paidOnWh === 0 || lineTotal <= headroom + EPS;
              return (
                <ProductCard
                  key={`${item.receiptItemId}-${item.productId}`}
                  item={item}
                  warehouses={warehouses}
                  canChangeWarehouse={canChangeWarehouse}
                  canDecrement={canDecrement}
                  canRemove={canRemove}
                  onQuantityChange={(productId, newQuantity, warehouseId) =>
                    onUpdateItem(receipt.id, productId, newQuantity, warehouseId)
                  }
                  onRemove={() => onRemoveItem(item.receiptItemId)}
                  onMoveToWarehouse={(newWarehouseId) =>
                    handleMoveToWarehouse(item.receiptItemId, item.productId, item.quantity, newWarehouseId)
                  }
                />
              );
            })
          )}
        </Box>
      )}

      {/* --- FOOTER --- */}
      <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2, mt: "auto" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="text.secondary">
            TOTAL:
          </Typography>
          <Typography variant="h4" fontWeight="bold" color="primary.main">
            {receipt.totalAmount.toFixed(2)}{" "}
            <Typography component="span" variant="h6" color="text.secondary">
              RON
            </Typography>
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          onClick={() => onAddPayment()}
          disabled={items.length === 0}
          sx={{ py: 1.5, fontSize: "1.1rem", fontWeight: "bold" }}
        >
          {items.length === 0 ? "Adaugă produse" : "ÎNCASARE / PLĂȚI"}
        </Button>
      </Box>

      {/* --- PICKER GESTIUNE CU STOC --- */}
      <Dialog
        open={warehousePickerOpen}
        onClose={handlePickerClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold" component="span">
            Selectează gestiunea
          </Typography>
          {pendingProduct && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {pendingProduct.name}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Header tabel */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2,
              py: 1,
              bgcolor: theme.palette.grey[100],
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              fontWeight="bold"
              color="text.secondary"
            >
              GESTIUNE
            </Typography>
            <Typography
              variant="caption"
              fontWeight="bold"
              color="text.secondary"
            >
              STOC DISPONIBIL
            </Typography>
          </Box>

          {/* Rânduri gestiuni */}
          <List disablePadding>
            {warehouses.map((w) => {
              const stockQty = stockPerWarehouse[w.id];
              const isTrackStock = pendingProduct?.trackStock !== false;
              const isOutOfStock =
                isTrackStock && !stockLoading && stockQty <= 0.0001;

              return (
                <ListItemButton
                  key={w.id}
                  onClick={() => {
                    if (isOutOfStock) { setStockSnackbar(true); return; }
                    handleWarehousePick(w.id);
                  }}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    py: 2,
                    px: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    opacity: isOutOfStock ? 0.4 : 1,
                  }}
                >
                  {/* Nume gestiune */}
                  <Typography variant="body1" fontWeight="500">
                    {w.name}
                  </Typography>

                  {/* Stoc */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {!isTrackStock ? (
                      // Produs fără trackStock → infinit
                      <AllInclusiveIcon fontSize="small" color="action" />
                    ) : stockLoading ? (
                      <CircularProgress size={16} />
                    ) : (
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{
                          color: isOutOfStock ? "error.main" : "success.main",
                        }}
                      >
                        {Number(stockQty ?? 0).toLocaleString("ro-RO", {
                          maximumFractionDigits: 2,
                        })}
                      </Typography>
                    )}
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={handlePickerClose} color="inherit">
            Anulează
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={stockSnackbar}
        autoHideDuration={3000}
        onClose={() => setStockSnackbar(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" sx={{ fontWeight: 'bold' }}>
          Stoc insuficient pe gestiunea selectată.
        </Alert>
      </Snackbar>
    </Paper>
  );
};

OpenedReceiptCard.propTypes = {
  receipt: PropTypes.object.isRequired,
  warehouses: PropTypes.array.isRequired,
  onBack: PropTypes.func.isRequired,
  onAddPayment: PropTypes.func.isRequired,
  onAddProduct: PropTypes.func.isRequired,
  onUpdateItem: PropTypes.func,
  onRemoveItem: PropTypes.func.isRequired,
  onCancelReceipt: PropTypes.func.isRequired,
  editMode: PropTypes.bool,
  stockMap: PropTypes.object,
};

export default OpenedReceiptCard;

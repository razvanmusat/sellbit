import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  TextField,
  List,
  ListItemButton,
  CircularProgress,
  Box,
  Paper,
  Typography,
  Divider,
  useTheme,
  ClickAwayListener,
} from "@mui/material";
import AllInclusiveIcon from "@mui/icons-material/AllInclusive";
import { StockCurrentService } from "../../../sales/api/StockCurrentService";
import { useProductSearch } from "../../hooks/useProductSearch";

// --- STOC LIVE PER GESTIUNE ---
const LiveStockDisplay = ({ warehouseId, productId, trackStock }) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trackStock === false) { setLoading(false); return; }
    if (!warehouseId) { setLoading(false); return; }

    let mounted = true;
    StockCurrentService.getProductStockLive(warehouseId, productId)
      .then((qty) => { if (mounted) setStock(Number(qty)); })
      .catch(() => { if (mounted) setStock(0); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [warehouseId, productId, trackStock]);

  if (trackStock === false) {
    return (
      <Typography variant="caption" color="text.secondary">
        <AllInclusiveIcon fontSize="small" sx={{ verticalAlign: "middle", fontSize: "1rem" }} />
      </Typography>
    );
  }

  if (loading) return <CircularProgress size={10} thickness={5} />;

  const displayVal = stock ?? 0;
  const isOutOfStock = displayVal <= 0.0001;

  return (
    <Typography variant="caption" fontWeight="bold"
      sx={{ color: isOutOfStock ? "error.main" : "success.main", fontSize: "0.75rem" }}>
      {Number(displayVal).toLocaleString("ro-RO", { maximumFractionDigits: 2 })}
    </Typography>
  );
};

// Stiluri comune pentru header și celule — același font peste tot
const headerCellStyle = {
  variant: "caption",
  fontWeight: "bold",
  color: "text.secondary",
  sx: { whiteSpace: "nowrap", fontSize: "0.75rem" },
};

// --- COMPONENTA PRINCIPALĂ ---
const ProductSearch = ({
  onProductSelect,
  warehouses = [],
  onlyTrackStock = false,
  showPrice = true,
}) => {
  const theme = useTheme();

  const { query, results, loading, hasSearched, errorMsg, handleQueryChange, clearSearch } =
    useProductSearch(onlyTrackStock);

  const [selectedIndex, setSelectedIndex] = useState(-1);

  const isNoResults = hasSearched && !loading && results.length === 0 && query.length >= 2 && !errorMsg;

  useEffect(() => { setSelectedIndex(-1); }, [results]);

  const handleClickAway = () => {
    if (results.length > 0 || query.length > 0) clearSearch();
  };

  const handleKeyDown = (e) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        handleProductClick(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      clearSearch();
    }
  };

  const handleProductClick = (product) => {
    onProductSelect(product);
    clearSearch();
    setSelectedIndex(-1);
  };

  // Lățime coloană stoc — calculată după cel mai lung nume de gestiune
  const maxWarehouseNameLen = warehouses.length > 0
    ? Math.max(...warehouses.map(w =>
        (warehouses.length === 1 ? "STOC" : `STOC ${w.name}`).length
      ))
    : 0;
  const warehouseColWidth = warehouses.length > 0
    ? `${Math.max(48, maxWarehouseNameLen * 7)}px`
    : "0px";

  // Preț — 7 caractere rezervate
  const priceColWidth = showPrice ? "64px" : "0px";

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: "relative" }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Caută produs (Nume / Cod)..."
          autoComplete="off"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Tastează numele produsului..."
          sx={{ mb: 1 }}
        />

        {/* Status overlay */}
        <Box sx={{
          position: "absolute", right: 12, top: 28, transform: "translateY(-50%)",
          display: "flex", alignItems: "center", gap: 1, pointerEvents: "none", zIndex: 5,
        }}>
          {isNoResults && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Nu s-au găsit produse
            </Typography>
          )}
          {errorMsg && (
            <Typography variant="caption" color="error" fontWeight="bold">{errorMsg}</Typography>
          )}
          {loading && <CircularProgress size={20} />}
        </Box>

        {/* Dropdown rezultate */}
        {results.length > 0 && (
          <Paper elevation={6} sx={{
            position: "absolute", zIndex: 1200, width: "100%",
            maxHeight: "50vh", overflow: "hidden",
            display: "flex", flexDirection: "column", borderRadius: 2,
          }}>

            {/* ======== HEADER ======== */}
            <Box sx={{
              px: 2, py: 1,
              bgcolor: theme.palette.grey[100],
              borderBottom: "1px solid", borderColor: "divider",
            }}>
              <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>

                {/* PRODUS */}
                <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                  <Typography {...headerCellStyle}>PRODUS</Typography>
                </Box>

                {/* STOC per gestiune */}
                {warehouses.map((w) => (
                  <Box key={w.id} sx={{
                    width: warehouseColWidth,
                    flexShrink: 0,
                    textAlign: "center",
                  }}>
                    <Typography {...headerCellStyle}>
                      {warehouses.length === 1 ? "STOC" : `STOC ${w.name}`}
                    </Typography>
                  </Box>
                ))}

                {/* PREȚ */}
                {showPrice && (
                  <Box sx={{ width: priceColWidth, flexShrink: 0, textAlign: "right" }}>
                    <Typography {...headerCellStyle}>PREȚ</Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* ======== RÂNDURI ======== */}
            <List sx={{ overflowY: "auto", p: 0 }}>
              {results.map((product, index) => (
                <React.Fragment key={product.id}>
                  <ListItemButton
                    onClick={() => handleProductClick(product)}
                    selected={index === selectedIndex}
                    sx={{
                      px: 2, py: 1,
                      "&.Mui-selected": {
                        bgcolor: theme.palette.primary.light + "20",
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                      },
                      "&.Mui-selected:hover": { bgcolor: theme.palette.primary.light + "30" },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>

                      {/* Nume produs */}
                      <Box sx={{ flex: 1, minWidth: 0, pr: 1, overflow: "hidden" }}>
                        <Typography variant="caption" fontWeight="500"
                          sx={{
                            fontSize: "0.75rem",
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "block",
                          }}>
                          {product.name}
                        </Typography>
                      </Box>

                      {/* Stoc per gestiune — aceeași lățime ca header */}
                      {warehouses.map((w) => (
                        <Box key={w.id} sx={{
                          width: warehouseColWidth,
                          flexShrink: 0,
                          textAlign: "center",
                        }}>
                          <LiveStockDisplay
                            warehouseId={w.id}
                            productId={product.id}
                            trackStock={product.trackStock}
                          />
                        </Box>
                      ))}

                      {/* Preț */}
                      {showPrice && (
                        <Box sx={{ width: priceColWidth, flexShrink: 0, textAlign: "right" }}>
                          <Typography variant="caption" color="text.secondary"
                            sx={{ fontSize: "0.75rem" }}>
                            {(product.salePrice || 0).toFixed(2)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </ListItemButton>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

ProductSearch.propTypes = {
  onProductSelect: PropTypes.func.isRequired,
  warehouses: PropTypes.array,
  onlyTrackStock: PropTypes.bool,
  showPrice: PropTypes.bool,
};

export default ProductSearch;
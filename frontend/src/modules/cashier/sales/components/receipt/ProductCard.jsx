import React from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const ProductCard = ({
  item,
  warehouses,
  onQuantityChange,
  onRemove,
  onMoveToWarehouse,
}) => {
  const {
    productId,
    name = "Produs invalid",
    quantity = 0,
    lineTotal = 0,
    warehouseId,
  } = item;

  const handleIncrement = () => {
    onQuantityChange(productId, quantity + 1, warehouseId);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(productId, quantity - 1, warehouseId);
    } else {
      onRemove();
    }
  };

  const handleWarehouseChange = async (e) => {
    const newWarehouseId = e.target.value;
    if (newWarehouseId === warehouseId) return;
    // onMoveToWarehouse gestionează remove + add în ordine corectă
    await onMoveToWarehouse(newWarehouseId);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        p: { xs: 1, sm: 1.5 },
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => theme.palette.background.paper,
        width: "100%",
        gap: 1,
      }}
    >
      {/* 1. NUME PRODUS */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: "500", lineHeight: 1.2, wordBreak: "break-word" }}
        >
          {name}
        </Typography>
      </Box>

      {/* 2. DROPDOWN GESTIUNE */}
      <FormControl size="small" sx={{ minWidth: 110, flexShrink: 0 }}>
        <Select
          value={warehouseId || ""}
          onChange={handleWarehouseChange}
          displayEmpty
          sx={{
            fontSize: "0.75rem",
            "& .MuiSelect-select": { py: 0.5, px: 1 },
          }}
        >
          {warehouses.map((w) => (
            <MenuItem key={w.id} value={w.id} sx={{ fontSize: "0.8rem" }}>
              {w.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 3. BUTOANE CANTITATE */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 0, sm: 0.5 },
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={handleDecrement}
          color={quantity === 1 ? "error" : "primary"}
          sx={{ p: 0.5 }}
        >
          {quantity === 1 ? <DeleteOutlineIcon /> : <RemoveCircleOutlineIcon />}
        </IconButton>
        <Typography
          variant="body1"
          sx={{ minWidth: "24px", textAlign: "center", fontWeight: "bold" }}
        >
          {quantity}
        </Typography>
        <IconButton onClick={handleIncrement} color="primary" sx={{ p: 0.5 }}>
          <AddCircleOutlineIcon />
        </IconButton>
      </Box>

      {/* 4. PREȚ TOTAL LINIE */}
      <Typography
        variant="h6"
        sx={{
          flexShrink: 0,
          textAlign: "right",
          fontWeight: "bold",
          whiteSpace: "nowrap",
          fontSize: { xs: "1rem", sm: "1.1rem" },
          minWidth: { xs: "auto", md: "90px" },
        }}
      >
        {(lineTotal || 0).toFixed(2)}
      </Typography>
    </Box>
  );
};

ProductCard.propTypes = {
  item: PropTypes.object.isRequired,
  warehouses: PropTypes.array.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onMoveToWarehouse: PropTypes.func.isRequired,
};

export default ProductCard;

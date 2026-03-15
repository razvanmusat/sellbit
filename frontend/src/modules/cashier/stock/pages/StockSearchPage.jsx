import React from "react";
import { Box, Paper, Typography, Container, Divider } from "@mui/material";
import { useSelector } from "react-redux";

// Reutilizăm componenta de Search
import ProductSearch from "../../sales/components/common/ProductSearch";

const StockSearchPage = ({ warehouseId }) => {
  const { warehouses } = useSelector((state) => state.cashier);

  // Găsim numele gestiunii
  const currentWarehouseName =
    warehouses?.find((w) => w.id === Number(warehouseId))?.name || "Gestiune";

  return (
    <Container maxWidth="md" sx={{ py: 1 }}>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        {/* Titlu centrat, identic cu pagina de Ajustări */}
        <Typography
          variant="h6"
          textAlign="center"
          fontWeight="bold"
          sx={{ mb: 1 }}
        >
          Verificare rapidă stoc în: {currentWarehouseName}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Zona de Search */}
        <Box sx={{ position: "relative" }}>
          <ProductSearch
            warehouses={warehouses.filter((w) => w.id === Number(warehouseId))}
            onProductSelect={() => {}}
            onlyTrackStock={true}
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default StockSearchPage;

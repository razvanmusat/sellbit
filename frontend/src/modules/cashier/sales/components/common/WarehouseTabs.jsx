import React from 'react';
import PropTypes from 'prop-types';
import { Box, Tabs, Tab } from '@mui/material';

function a11yProps(index) {
  return {
    id: `warehouse-tab-${index}`,
    'aria-controls': `warehouse-tabpanel-${index}`,
  };
}

const WarehouseTabs = ({ warehouses, selectedWarehouseId, onWarehouseChange }) => {
  return (
    <Box sx={{ width: '100%', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={selectedWarehouseId || false}
        onChange={onWarehouseChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        aria-label="Selectare Gestiune"
        textColor="primary"
        indicatorColor="primary"
      >
        {warehouses.map((warehouse) => (
          <Tab 
            key={warehouse.id} 
            label={warehouse.name} 
            value={warehouse.id}
            {...a11yProps(warehouse.id)}
          />
        ))}
      </Tabs>
    </Box>
  );
};

WarehouseTabs.propTypes = {
  warehouses: PropTypes.array.isRequired,
  selectedWarehouseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onWarehouseChange: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
};

export default WarehouseTabs;
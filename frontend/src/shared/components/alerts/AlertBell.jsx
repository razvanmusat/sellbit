import React from 'react';
import {
  IconButton,
  Tooltip,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

const AlertBell = ({ totalAlerts, onClick }) => {
  return (
    <Tooltip title={totalAlerts > 0 ? `${totalAlerts} alerte nerezolvate` : 'Nicio alertă'}>
      <IconButton
        onClick={onClick}
        sx={{
          position: 'relative',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        {totalAlerts > 0 ? (
          <NotificationsActiveIcon
            sx={{
              color: '#fbff00',
              transition: 'color 0.3s ease',
              fontSize: '1.5rem',
            }}
          />
        ) : (
          <NotificationsIcon
            sx={{
              color: '#ffffff',
              transition: 'color 0.3s ease',
              fontSize: '1.5rem',
            }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default AlertBell;

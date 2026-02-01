import React from 'react';
import { Box, Typography } from '@mui/material';
 
const Home = () => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.7,
      }}
    >
      <Typography variant="h5" fontWeight="bold" color="text.secondary">
        👆 Alege o opțiune din meniul de sus pentru a începe
      </Typography>
    </Box>
  );
};

export default Home;
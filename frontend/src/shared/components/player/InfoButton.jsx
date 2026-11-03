import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Iconiță „info”: la click se deschide o fereastră cu ce e de făcut pe tab. info = { title, label, points }.
const InfoButton = ({ info }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip title={info.title}>
        <IconButton size="small" aria-label={info.label} onClick={() => setOpen(true)}>
          <InfoOutlinedIcon />
        </IconButton>
      </Tooltip>
      {open && (
        <Dialog open onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogContent dividers>
            <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 1.25 } }}>
              {info.points.map((point) => (
                <Typography key={point} component="li" variant="body2">{point}</Typography>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)} variant="contained">Am înțeles</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default InfoButton;

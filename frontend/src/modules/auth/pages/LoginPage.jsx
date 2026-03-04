import React, { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../shared/store/hooks';
import { loginUser, clearError, setError } from '../state/authSlice';

const LoginPage = () => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const handleChange = (e) => {
    if (error) dispatch(clearError());
    setCreds({ ...creds, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!creds.username || !creds.password) {
      dispatch(setError('Introdu utilizatorul și parola.'));
      return;
    }

    try {
      await dispatch(loginUser(creds)).unwrap();      
      
      navigate('/cashier/home', { replace: true });
      
    } catch (err) {      
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', position: 'relative' }}>
      {/* Logo stânga sus */}
      <Box sx={{ position: 'fixed', top: 32, left: 32, zIndex: 1000 }}>
        <img src="/logolucaland.png" alt="Luca Land PLAY" style={{ width: 90, height: 60, objectFit: 'contain', display: 'block' }} />
      </Box>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: 2 }}>
        <Typography variant="h5" align="center" gutterBottom fontWeight="bold" color="primary">SELLBIT POS</Typography>
        <form onSubmit={handleSubmit} autoComplete="off">
          <TextField
            fullWidth label="Utilizator" name="username" margin="normal"
            value={creds.username} onChange={handleChange} autoFocus
            error={!!error} autoComplete="off"
          />
          <TextField
            fullWidth label="Parolă" name="password" type="password" margin="normal"
            value={creds.password} onChange={handleChange}
            error={!!error} autoComplete="new-password"
          />
          <Button 
            type="submit" fullWidth variant="contained" size="large" 
            disabled={isLoading} sx={{ mt: 3, mb: 1, height: 48 }}
          >
            {isLoading ? 'Se încarcă...' : 'Intră în cont'}
          </Button>
        </form>
      </Paper>

      {/* Semnătură dreapta jos */}
      <Box sx={{ position: 'fixed', right: 32, bottom: 40, zIndex: 9999, color: '#888', fontSize: 13, userSelect: 'none' }}>
        © 2026 Worldbit.ro — Dezvoltat de Mușat Răzvan
      </Box>

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => dispatch(clearError())} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
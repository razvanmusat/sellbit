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
      
      // --- MODIFICAREA: REDIRECT UNIC ---
      // Indiferent cine ești (Admin sau Casier), mergi la interfața de vânzare
      navigate('/cashier/home', { replace: true });
      
    } catch (err) {
      // Redux
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
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

      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => dispatch(clearError())} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" variant="filled">{error}</Alert>
      </Snackbar>
    </Box>
  );
};

export default LoginPage;
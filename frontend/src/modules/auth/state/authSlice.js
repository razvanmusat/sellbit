import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AuthService } from '../../../shared/api/AuthService';

// --- 0. DICȚIONAR DE ERORI (HARDCODED PENTRU FRONTEND) ---
const translateError = (backendMessage) => {
  const msg = backendMessage || '';

  // Orice eroare legată de user/parolă/cont devine mesajul generic
  if (
    msg.includes('Bad credentials') || 
    msg.includes('ERROR.AUTH') || 
    msg.includes('ERROR.USER') ||
    msg.includes('User is disabled') ||
    msg.includes('User account is locked')
  ) {
    return 'Nume de utilizator sau parolă incorecte.';
  }

  // Fallback pentru erori de server (ex: DB picată)
  return 'Eroare de conexiune. Încearcă din nou.';
};

// --- 1. ACȚIUNEA DE LOGIN ---
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(username, password);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response));
      
      return response; 
    } catch (err) {
      // Aici aplicăm traducerea forțată
      const friendlyMessage = translateError(err.message);
      return rejectWithValue(friendlyMessage);
    }
  }
);

// --- STATE & SLICE ---
const userFromStorage = localStorage.getItem('user');
const initialState = {
  user: userFromStorage ? JSON.parse(userFromStorage) : null,
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {    
    // Acțiunea de logout: curăță state-ul și localStorage
    logout: (state) => {
      state.user = null;
      state.token = null;
      AuthService.logout(); // Apelează metoda care șterge din localStorage
    },
    setError: (state, action) => { 
      state.error = action.payload;
    },    
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload; // Mesajul tradus ajunge în UI
      });
  },
});

export const { logout, clearError, setError } = authSlice.actions;
export default authSlice.reducer;
import { createTheme } from '@mui/material/styles';

// --- DEFINIREA REGULILOR DE ECRAN (BREAKPOINTS) ---
const breakpoints = {
  values: {
    xs: 0,
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  },
};

const theme = createTheme({
  breakpoints: breakpoints,
  
  // --- PALETA DE CULORI ---
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' }, // Roșu pentru Ștergere/Minus
    success: { main: '#2e7d32' },   // Verde pentru Butonul "Plătește"
    background: { default: '#f4f6f8', paper: '#ffffff' },
    action: { selected: 'rgba(25, 118, 210, 0.12)' }
  },

  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    htmlFontSize: 16,
    h1: { fontSize: '2.5rem', fontWeight: 500 },
    h2: { fontSize: '2rem', fontWeight: 500 },
    h3: { fontSize: '1.75rem', fontWeight: 500 },
    // Stil pentru TOTAL DE PLATĂ (mare și vizibil)
    h4: { fontWeight: 700, letterSpacing: '-0.5px' }, 
    // Stil pentru Nume Produs în listă
    subtitle1: { fontWeight: 600, lineHeight: 1.2 },
  },

  components: {
    // --- 0. GLOBAL CSS ---
    MuiCssBaseline: {
      styleOverrides: {
        html: { overscrollBehavior: 'none' },
        body: {
          userSelect: 'none', 
          '&::-webkit-scrollbar': { width: '10px', height: '10px' },
          '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
          '&::-webkit-scrollbar-thumb': { background: '#c1c1c1', borderRadius: '5px' },
          '&::-webkit-scrollbar-thumb:hover': { background: '#a8a8a8' },
        },
        // FIX: Proprietățile CSS trebuie să fie camelCase, nu kebab-case
        'input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button': {
          WebkitAppearance: 'none', 
          margin: 0,
        },
        'input[type=number]': { 
          MozAppearance: 'textfield' 
        },
      },
    },

    // 1. BUTOANELE (MuiButton)
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          [`@media (max-width:${breakpoints.values.sm}px)`]: {
            padding: '10px 16px', fontSize: '1rem',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': { boxShadow: '0px 2px 4px rgba(0,0,0,0.2)' },
        },
      },
    },

    // 2. INPUTURI TEXT (Search Bar, Qty Input)
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          [`@media (max-width:${breakpoints.values.sm}px)`]: { minHeight: '48px' },
        },
        // Centrare text (util pentru căsuța de cantitate dintre - și +)
        input: {
          textAlign: 'center', 
        }
      },
    },

    // 3. TABELE
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          [`@media (max-width:${breakpoints.values.sm}px)`]: { padding: '8px 4px', fontSize: '0.8rem' },
        },
        head: { fontWeight: 700, backgroundColor: '#f5f5f5' },
      },
    },

    // 4. MODALE (Plată, Adăugare produs)
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          [`@media (max-width:${breakpoints.values.sm}px)`]: { margin: 10, width: '100%', maxWidth: '100%' },
        },
      },
    },

    // 5. APP BAR
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: '0px 1px 3px rgba(0,0,0,0.12)' },
      },
    },

    // 6. CARDS (Bonuri deschise)
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 12 },
      },
    },

    // 7. CONTAINER
    MuiContainer: {
      styleOverrides: {
        root: {
          [`@media (min-width:${breakpoints.values.lg}px)`]: { paddingLeft: 32, paddingRight: 32 },
        },
      },
    },
    
    // 8. ACCORDION
    MuiAccordion: {
      styleOverrides: {
        root: {
          boxShadow: 'none', border: '1px solid #e0e0e0',
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        },
      },
    },

    // 9. CHOICE CHIPS
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500, borderRadius: 8, border: '1px solid transparent',
          [`@media (max-width:${breakpoints.values.sm}px)`]: { height: 40, fontSize: '0.95rem', padding: '0 4px' },
        },
        filledPrimary: {
          backgroundColor: '#1976d2', color: '#fff',
          '&:hover': { backgroundColor: '#1565c0' },
        },
        outlined: {
          borderColor: '#e0e0e0', color: '#666', backgroundColor: '#fff',
          '&:hover': { borderColor: '#1976d2', backgroundColor: 'rgba(25, 118, 210, 0.04)' },
        },
      },
    },

    // 10. LISTE (Dropdowns)
    MuiMenuItem: {
      styleOverrides: {
        root: {
          paddingTop: 12, paddingBottom: 12, borderRadius: 4, 
          [`@media (max-width:${breakpoints.values.sm}px)`]: { minHeight: 48 },
        },
      },
    },

    // 11. ICON BUTTONS (Butoanele + și -)
    MuiIconButton: {
      styleOverrides: {
        root: {
          // Asigurăm zona de atingere mare chiar dacă iconița e mică
          padding: 8,
          [`@media (max-width:${breakpoints.values.sm}px)`]: { padding: 12 }, 
        },
      },
    },

    // 12. TABS (Bonuri Deschise / Închise) (Stil Pastilă: Activ = Albastru Plin)    
    // 12. TABS (Reparat: Stil Standard MUI - Linie Jos)
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 48,
          backgroundColor: 'transparent', // FĂRĂ fundal gri
          borderRadius: 0,                // Fără colțuri rotunjite la container
          padding: 0,
        },
        indicator: {
          height: 3,                      // Linie puțin mai groasă, vizibilă
          backgroundColor: '#1976d2',     // Albastru
          borderTopLeftRadius: 3,         // Rotunjim puțin linia sus
          borderTopRightRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',          // Scris normal
          fontWeight: 600,
          minHeight: 48,
          fontSize: '1rem',
          color: '#666',                  // Gri inactiv
          
          // Responsive Font
          [`@media (max-width:${breakpoints.values.sm}px)`]: { 
            fontSize: '0.9rem', 
            minHeight: 40 
          },

          '&:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.04)', // Hover fin
            color: '#1976d2',
          },
          
          '&.Mui-selected': {
            color: '#1976d2',             // Text ALBASTRU
            backgroundColor: 'transparent', // FĂRĂ fundal
            fontWeight: 700,
          },
        },
      },
    },
  },
});

export default theme;
import React, { useState, useEffect } from 'react';
import { 
    Autocomplete, 
    TextField, 
    CircularProgress, 
    Snackbar, 
    Alert 
} from '@mui/material';

// Importăm serviciile din modulele tale (căi relative corecte)
import { ProductService } from '../api/ProductService'; 
import { LookupService } from '../api/LookupService'; 

// Utilitarul de erori
import { getFriendlyErrorMessage } from '../../../../shared/utils/errorHandler';

const SimpleProductSearch = ({ onSelect }) => {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    
    // Stocăm dinamic ID-ul tipului "MENU"
    const [menuTypeId, setMenuTypeId] = useState(null);

    // State Erori (Snackbar)
    const [snackbar, setSnackbar] = useState({ 
        open: false, 
        message: '', 
        severity: 'error' 
    });

    const handleCloseSnackbar = () => {
        setSnackbar((prev) => ({ ...prev, open: false }));
    };

    // 1. LA INITIALIZARE: Aflăm ID-ul pentru 'MENU' din baza de date
    useEffect(() => {
        const fetchMenuTypeId = async () => {
            try {
                // Folosim LookupService pentru a lua toate tipurile
                const types = await LookupService.getAllProductTypes(); 
                
                const menuType = types.find(t => t.code === 'MENU');
                
                if (menuType) {
                    setMenuTypeId(menuType.id);
                } else {
                    console.warn("Sistem: Nu s-a găsit tipul de produs cu codul 'MENU'. Filtrarea nu va funcționa.");
                }
            } catch (error) {
                console.error("Nu s-au putut încărca definițiile de tipuri:", error);
            }
        };
        fetchMenuTypeId();
    }, []);

    // 2. LOGICA DE CĂUTARE (Live Search)
    useEffect(() => {
        let active = true;

        if (inputValue.length < 2) {
            setOptions([]);
            return undefined;
        }

        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Apelăm endpoint-ul de search
                const results = await ProductService.searchForAdmin(inputValue);
                
                if (active) {
                    // FILTRARE DINAMICĂ:
                    // Excludem produsele care au ID-ul tipului "MENU" (găsit anterior)
                    let filtered = results;
                    
                    if (menuTypeId) {
                        filtered = results.filter(p => p.productTypeId !== menuTypeId);
                    }
                    
                    setOptions(filtered);
                }
            } catch (error) {
                // Gestionare eroare prin dicționarul tău
                const friendlyMsg = getFriendlyErrorMessage(error);
                setSnackbar({
                    open: true,
                    message: friendlyMsg,
                    severity: 'error'
                });
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        const timer = setTimeout(() => {
            fetchProducts();
        }, 400);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [inputValue, menuTypeId]); 

    return (
        <>
            <Autocomplete
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                // Identificator unic
                isOptionEqualToValue={(option, value) => option.id === value.id}
                // Label în listă
                getOptionLabel={(option) => `${option.name} (${option.salePrice} LEI)`}
                options={options}
                loading={loading}
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => {
                    setInputValue(newInputValue);
                }}
                onChange={(event, newValue) => {
                    if (newValue) {
                        onSelect(newValue); 
                        setInputValue('');  
                        setOptions([]);     
                    }
                }}
                // RANDARE INPUT (Fix pentru 'InputProps deprecated')
                renderInput={(params) => {
                    // Extragem InputProps din params ca să nu le pasăm duplicat
                    const { InputProps, ...restParams } = params;
                    
                    return (
                        <TextField
                            {...restParams}
                            label="Caută ingredient (ex: Pizza, Cola...)"
                            variant="outlined"
                            size="small"
                            // Folosim slotProps.input conform standardelor noi MUI
                            slotProps={{
                                input: {
                                    ...InputProps, 
                                    endAdornment: (
                                        <React.Fragment>
                                            {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                            {InputProps.endAdornment}
                                        </React.Fragment>
                                    ),
                                }
                            }}
                        />
                    );
                }}
                // RANDARE OPȚIUNE (Curat, fără props inutile)
                renderOption={(props, option) => {
                    const { key, ...otherProps } = props;
                    return (
                        <li key={key} {...otherProps}>
                            {option.name} 
                        </li>
                    );
                }}
            />


            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }} 
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity} 
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </>
    );
};

export default SimpleProductSearch;
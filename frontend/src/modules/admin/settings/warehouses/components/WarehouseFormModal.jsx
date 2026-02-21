import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box 
} from '@mui/material';

const WarehouseFormModal = ({ open, onClose, onSubmit, initialData }) => {
    const [formData, setFormData] = useState({ code: '', name: '' });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({ 
                    id: initialData.id,
                    code: initialData.code, 
                    name: initialData.name 
                });
            } else {
                setFormData({ code: '', name: '' });
            }
            setErrors({});
        }
    }, [open, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSubmit = (e) => {
        // Prevenim submit-ul default daca e apelat din form
        if (e) e.preventDefault();
        
        const newErrors = {};
        if (!formData.code.trim()) newErrors.code = "Codul este obligatoriu.";
        if (!formData.name.trim()) newErrors.name = "Numele este obligatoriu.";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose} 
            maxWidth="xs" 
            fullWidth
            /* Rezervă spațiul pentru scrollbar (previne layout shift) */
            disableScrollLock={false} 
            /* Fix pentru eroarea de aria-hidden în React 19 */
            aria-hidden={!open}
        >
            <DialogTitle>
                {initialData ? 'Editează Gestiune' : 'Adaugă Gestiune Nouă'}
            </DialogTitle>
            <DialogContent>
                <Box 
                    component="form" 
                    autoComplete="off"
                    onSubmit={handleSubmit}
                    display="flex" 
                    flexDirection="column" 
                    gap={2} 
                    mt={1}
                >
                    <TextField
                        label="Nume Gestiune"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        error={!!errors.name}
                        helperText={errors.name}
                        fullWidth
                        autoFocus
                        autoComplete="off"
                    />
                    <TextField
                        label="Cod Gestiune"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        error={!!errors.code}
                        helperText={errors.code}
                        fullWidth
                        autoComplete="off"
                        slotProps={{
                            htmlInput: { style: { textTransform: 'uppercase' } }
                        }}
                    />
                    {/* Input ascuns pentru a permite submit pe Enter fără a strica layout-ul */}
                    <button type="submit" style={{ display: 'none' }} />
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Anulează</Button>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    color="primary"
                    type="submit"
                >
                    Salvează
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default WarehouseFormModal;
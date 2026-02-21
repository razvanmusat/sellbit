import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Stack
} from '@mui/material';

const DEFAULT_FORM = {
    username: '',
    fullName: '',
    roleId: ''
};

const UserFormModal = ({ open, onClose, onSubmit, user, roles = [], loading = false }) => {
    const isEdit = Boolean(user);
    const [form, setForm] = useState(DEFAULT_FORM);

    useEffect(() => {
        if (isEdit) {
            setForm({
                username: user.username || '',
                fullName: user.fullName || '',
                roleId: user.roleId || ''
            });
            return;
        }

        setForm(DEFAULT_FORM);
    }, [isEdit, user, open]);

    const isValid = useMemo(() => {
        return Boolean(
            form.username?.trim() &&
            form.fullName?.trim() &&
            form.roleId
        );
    }, [form]);

    const handleChange = (field) => (event) => {
        setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

    const handleSubmit = () => {
        if (!isValid || loading) {
            return;
        }

        onSubmit({
            username: form.username.trim(),
            fullName: form.fullName.trim(),
            roleId: Number(form.roleId),
            languageCode: isEdit ? (user?.languageCode || 'ro') : 'ro'
        });
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{isEdit ? 'Editează Utilizator' : 'Adaugă Utilizator'}</DialogTitle>
            <DialogContent component="form" autoComplete="off">
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Username"
                        value={form.username}
                        onChange={handleChange('username')}
                        helperText="Username de forma: prenume.nume"
                        fullWidth
                        size="small"
                        autoComplete="off"
                        slotProps={{ htmlInput: { autoComplete: 'off', name: 'sb-user-username' } }}
                    />

                    <TextField
                        label="Nume complet"
                        value={form.fullName}
                        onChange={handleChange('fullName')}
                        fullWidth
                        size="small"
                        autoComplete="off"
                        slotProps={{ htmlInput: { autoComplete: 'off', name: 'sb-user-fullname' } }}
                    />

                    <TextField
                        label="Rol"
                        value={form.roleId}
                        onChange={handleChange('roleId')}
                        select
                        fullWidth
                        size="small"
                    >
                        {roles.map((role) => (
                            <MenuItem key={role.id} value={role.id}>
                                {role.label}
                            </MenuItem>
                        ))}
                    </TextField>

                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Anulează</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={!isValid || loading}>
                    {isEdit ? 'Salvează' : 'Creează'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserFormModal;

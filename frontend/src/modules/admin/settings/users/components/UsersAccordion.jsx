import React from 'react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Button,
    Chip,
    Paper,
    Stack,
    Box,
    Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';

const UsersAccordion = ({
    title,
    users,
    defaultExpanded = false,
    emptyText,
    activeSection = true,
    onEdit,
    onDeactivate,
    onResetPassword,
    onReactivate,
    actionLoading = false
}) => {
    return (
        <Accordion defaultExpanded={defaultExpanded} elevation={2}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" fontWeight="bold">
                    {title} ({users.length})
                </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2, bgcolor: '#fafafa' }}>
                {users.length === 0 ? (
                    <Alert severity="info">{emptyText}</Alert>
                ) : (
                    <List disablePadding>
                        {users.map((user) => (
                            <Paper key={user.id} variant="outlined" sx={{ mb: 1 }}>
                                <ListItem
                                    secondaryAction={
                                        activeSection ? (
                                            <Stack direction="row" spacing={1}>
                                                <IconButton
                                                    color="primary"
                                                    onClick={() => onEdit(user)}
                                                    disabled={actionLoading}
                                                    title="Editează"
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    color="warning"
                                                    onClick={() => onResetPassword(user)}
                                                    disabled={actionLoading}
                                                    title="Reset parolă"
                                                >
                                                    <LockResetIcon />
                                                </IconButton>
                                                <IconButton
                                                    color="error"
                                                    onClick={() => onDeactivate(user)}
                                                    disabled={actionLoading}
                                                    title="Dezactivează"
                                                >
                                                    <PersonOffIcon />
                                                </IconButton>
                                            </Stack>
                                        ) : (
                                            <Button
                                                variant="outlined"
                                                color="success"
                                                startIcon={<PersonAddAlt1Icon />}
                                                onClick={() => onReactivate(user)}
                                                disabled={actionLoading}
                                            >
                                                Reactivează
                                            </Button>
                                        )
                                    }
                                >
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography fontWeight="bold">{user.fullName}</Typography>
                                                <Chip label={user.roleLabel} size="small" color="primary" variant="outlined" />
                                            </Stack>
                                        }
                                        secondary={
                                            <Box component="span" sx={{ display: 'inline-flex', gap: 1 }}>
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    @{user.username}
                                                </Typography>
                                            </Box>
                                        }
                                        slotProps={{ secondary: { component: 'span' } }}
                                    />
                                </ListItem>
                            </Paper>
                        ))}
                    </List>
                )}
            </AccordionDetails>
        </Accordion>
    );
};

export default UsersAccordion;

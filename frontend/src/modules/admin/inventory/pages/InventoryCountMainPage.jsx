import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Paper, Tabs, Tab, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck'; 
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'; 
import StoreIcon from '@mui/icons-material/Store';

// Importăm noile componente
import InventoryPrintList from '../components/InventoryPrintList';
import InventoryOperation from '../components/InventoryOperation';

const InventoryCountMainPage = ({ warehouseId, warehouseName }) => {
    // SubTab Local: 0 = Print, 1 = Operare (folosim state local sau url params dacă vrei persistență la subtab, aici am lăsat local ca în original, deși originalul avea mix)
    // În codul tău original foloseai `useState(0)` pentru subTab aici, nu URL. Am păstrat logica ta.
    const [subTab, setSubTab] = useState(0); 

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {!warehouseId ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'text.secondary', opacity: 0.7, mt: 4 }}>
                    <StoreIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
                    <Typography variant="h6">👆 Alege gestiunea pentru Inventar.</Typography>
                </Box>
            ) : (
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', mt: 1 }}>
                    
                    {/* TABURI NAVIGARE (No Print) */}
                    <Paper className="no-print" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', px: 1, bgcolor: 'transparent' }}>
                        <Tabs 
                            value={subTab} 
                            onChange={(e, v) => setSubTab(v)} 
                            indicatorColor="primary" 
                            textColor="primary"
                        >
                            <Tab icon={<FactCheckIcon />} iconPosition="start" label="Listă Printare" />
                            <Tab icon={<PlaylistAddCheckIcon />} iconPosition="start" label="Operare Faptic" />
                        </Tabs>
                    </Paper>

                    {/* CONTENT AREA */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 0, mt: 2 }}>
                        {subTab === 0 && (
                            <InventoryPrintList 
                                warehouseId={warehouseId} 
                                warehouseName={warehouseName} 
                            />
                        )}
                        {subTab === 1 && (
                            <InventoryOperation 
                                warehouseId={warehouseId} 
                            />
                        )}
                    </Box>
                </Box>
            )}
        </Box>
    );
};

export default InventoryCountMainPage;
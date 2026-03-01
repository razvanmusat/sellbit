import React from 'react';
import { 
    Box, Paper, Typography, Button, TextField, InputAdornment, 
    CircularProgress, Alert 
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import SearchIcon from '@mui/icons-material/Search';

import { useInventoryPrintList } from '../hooks/useInventoryPrintList';

// Păstrăm stilurile de print care funcționează (CSS AGRESIV)
const printStyles = `
    @media print {
        html, body, #root, .App, .inventory-page {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
        }
        body * { visibility: hidden; }
        .no-print, header, footer, nav, .MuiAppBar-root, .MuiDrawer-root, .MuiTabs-root, .MuiBottomNavigation-root {
            display: none !important;
        }
        .print-area, .print-area * { visibility: visible !important; }
        .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
            z-index: 9999 !important;
            height: auto !important;
            display: block !important;
        }
        .print-header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px solid #000; 
            padding-bottom: 10px; 
            display: block !important; 
        }
        .print-table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        .print-table th, .print-table td { border: 1px solid #000; padding: 4px; font-size: 12px; color: black; }
        .print-table tr { page-break-inside: avoid; page-break-after: auto; }
        .print-category-header { 
            background: #eee !important; 
            color: black !important; 
            border: 1px solid #000; 
            font-weight: bold; 
            -webkit-print-color-adjust: exact; 
        }
    }
`;

const InventoryPrintList = ({ warehouseId, warehouseName }) => {
    const {
        loading,
        error,
        filterQuery, 
        setFilterQuery,
        groupedStock,
        handlePrint
    } = useInventoryPrintList(warehouseId);

    if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <style>{printStyles}</style>

            {/* CONTROL PANEL */}
            {/* MODIFICAT: justifyContent: 'space-between' pentru a separa elementele stânga-dreapta */}
            <Paper className="no-print" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.1)', p: 1, bgcolor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                
                {/* STÂNGA: Căutare Categorie */}
                <TextField 
                    placeholder="Filtrează Categorie (ex: Băuturi)..." 
                    size="small"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small"/></InputAdornment> } }}
                    sx={{ width: 300, bgcolor: 'white' }}
                />

                {/* DREAPTA: Buton Print */}
                <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                    Printează Lista
                </Button>
            </Paper>

            {/* ZONA DE PRINT */}
            <Box className="print-area" sx={{ bgcolor: 'white', p: 4, flex: 1, overflowY: 'auto' }}>
                
                <div className="print-header" style={{ display: 'none' }}>
                    <Typography variant="h4" fontWeight="bold">LISTĂ INVENTARIERE</Typography>
                    <Typography variant="h6">{warehouseName}</Typography>
                    <Typography variant="caption">Data: {dayjs().format('DD/MM/YYYY')}</Typography>
                </div>

                {/* Mesaj informativ */}
                {filterQuery && Object.keys(groupedStock).length > 0 && (
                    <Box className="no-print" sx={{ mb: 2, p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                            Se va printa doar categoria: "{Object.keys(groupedStock)[0]}"
                        </Typography>
                    </Box>
                )}

                {Object.keys(groupedStock).sort().map(category => (
                    <Box key={category} sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" className="print-category-header" sx={{ bgcolor: '#eee', p: 0.5, px: 1, fontWeight: 'bold', border: '1px solid #ccc', borderBottom: 'none' }}>
                            {category}
                        </Typography>
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50%', textAlign: 'left' }}>PRODUS</th>
                                    <th style={{ width: '10%' }}>UM</th>
                                    <th style={{ width: '10%', textAlign: 'right' }}>SCRIPTIC</th>
                                    <th style={{ width: '30%', borderLeft: '2px solid black' }}>FAPTIC (Pix)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedStock[category].map(item => (
                                    <tr key={item.productId}>
                                        <td>{item.productName}</td>
                                        <td style={{ textAlign: 'center' }}>{item.unitName}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{Number(item.quantity).toLocaleString('ro-RO')}</td>
                                        <td style={{ borderLeft: '2px solid black', height: '30px' }}></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                ))}

                {Object.keys(groupedStock).length === 0 && (
                    <Typography className="no-print" sx={{ mt: 4, textAlign: 'center', color: 'text.secondary' }}>
                        Nicio categorie găsită pentru "{filterQuery}".
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default InventoryPrintList;
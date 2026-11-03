import React, { useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

// Listă cu drag & drop nativ (fără bibliotecă): se trage de mâner și se lasă pe rândul dorit.
// renderItem(item, index, handle): `handle` e mânerul de tras, de pus oriunde în rând.
// onMove(from, to): elementul de la `from` ajunge pe poziția `to`.
const SortableList = ({ items, getKey, onMove, renderItem, gap = 1 }) => {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap }}>
      {items.map((item, index) => {
        const isTarget = dragIndex !== null && overIndex === index && dragIndex !== index;

        const handle = (
          <Tooltip title="Trage ca să schimbi ordinea">
            <Box
              component="span"
              draggable
              onDragStart={(event) => {
                const row = event.currentTarget.closest('[data-sortable-row]');
                if (row) event.dataTransfer.setDragImage(row, 16, 16);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
                setDragIndex(index);
              }}
              onDragEnd={reset}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                color: 'text.secondary',
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <DragIndicatorIcon />
            </Box>
          </Tooltip>
        );

        return (
          <Box
            key={getKey(item)}
            data-sortable-row
            onDragOver={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              if (overIndex !== index) setOverIndex(index);
            }}
            onDrop={(event) => {
              if (dragIndex === null) return;
              event.preventDefault();
              if (dragIndex !== index) onMove(dragIndex, index);
              reset();
            }}
            sx={{
              borderRadius: 1,
              opacity: dragIndex === index ? 0.45 : 1,
              outline: (theme) => (isTarget ? `2px dashed ${theme.palette.primary.main}` : 'none'),
              outlineOffset: 2,
            }}
          >
            {renderItem(item, index, handle)}
          </Box>
        );
      })}
    </Box>
  );
};

export default SortableList;

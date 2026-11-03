import React from 'react';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { filesInFolder } from './playerUtils';

// Folderele create de utilizator, cu numărul de fișiere din fiecare (după `files`).
const FolderList = ({ files, folders, assignments, view, onSelect }) => {
  const items = folders.map((name) => ({
    key: name,
    label: name,
    icon: view === name ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />,
  }));

  return (
    <List dense disablePadding>
      {items.map((item) => (
        <ListItemButton key={item.key} selected={view === item.key} onClick={() => onSelect(item.key)}>
          <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
          <ListItemText
            primary={item.label}
            slotProps={{ primary: { noWrap: true } }}
          />
          <ListItemText
            primary={filesInFolder(files, assignments, item.key).length}
            sx={{ flex: 'none', ml: 1, color: 'text.secondary' }}
          />
        </ListItemButton>
      ))}
    </List>
  );
};

export default FolderList;

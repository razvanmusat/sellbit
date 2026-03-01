import { client } from './client';

const API_BASE = '/api/uploads';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toEncodedFileName = (fileName) => encodeURIComponent(String(fileName || '').trim());

const parseErrorResponse = async (response) => {
  const text = await response.text();

  try {
    const data = JSON.parse(text);
    return Promise.reject(new Error(data?.message || `HTTP Error: ${response.status}`));
  } catch {
    return Promise.reject(new Error(text || `HTTP Error: ${response.status}`));
  }
};

export const UploadService = {
  list: async (folder) => {
    if (folder) {
      return client('uploads', { params: { folder } });
    } else {
      return client('uploads');
    }
  },

  upload: async (file, folder) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    const response = await fetch('/api/uploads', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  },

  delete: async (fileName, folder) => {
    const encodedFileName = toEncodedFileName(fileName);
    return client(`uploads/${encodedFileName}`, {
      params: folder ? { folder } : undefined,
      method: 'DELETE'
    });
  },

  fetchPreviewBlob: async (fileName, folder) => {
    const encodedFileName = toEncodedFileName(fileName);
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    const response = await fetch(`${API_BASE}/${encodedFileName}${query}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) {
      return parseErrorResponse(response);
    }

    return response.blob();
  },

  fetchDownloadBlob: async (fileName, folder) => {
    const encodedFileName = toEncodedFileName(fileName);
    const query = new URLSearchParams({ download: 'true' });
    if (folder) query.set('folder', folder);

    const response = await fetch(`${API_BASE}/${encodedFileName}?${query.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) {
      return parseErrorResponse(response);
    }

    return response.blob();
  },

  // FOLDERS API
  listFolders: async () => {
    const response = await fetch('/api/uploads/folders/list', {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) return parseErrorResponse(response);
    return response.json();
  },
  createFolder: async (name) => {
    const response = await fetch('/api/uploads/folders/create?name=' + encodeURIComponent(name), {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });
    if (!response.ok) return parseErrorResponse(response);
    return response.text(); // return text, not json
  },
  renameFolder: async (oldName, newName) => {
    const response = await fetch(`/api/uploads/folders/rename?oldPath=${encodeURIComponent(oldName)}&newName=${encodeURIComponent(newName)}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });
    if (!response.ok) return parseErrorResponse(response);
    return response.text();
  },
  deleteFolder: async (name) => {
    const response = await fetch(`/api/uploads/folders/delete?path=${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });
    if (!response.ok) return parseErrorResponse(response);
    return response.text();
  },
};

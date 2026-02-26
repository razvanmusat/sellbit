import { client } from './client';

const API_BASE = '/api/uploads';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

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
  list: async () => client('uploads'),

  upload: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return client('uploads', {
      method: 'POST',
      body: formData
    });
  },

  delete: async (fileName) => {
    return client(`uploads/${encodeURIComponent(fileName)}`, {
      method: 'DELETE'
    });
  },

  fetchPreviewBlob: async (fileName) => {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(fileName)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) {
      return parseErrorResponse(response);
    }

    return response.blob();
  },

  fetchDownloadBlob: async (fileName) => {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(fileName)}?download=true`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include'
    });

    if (!response.ok) {
      return parseErrorResponse(response);
    }

    return response.blob();
  }
};

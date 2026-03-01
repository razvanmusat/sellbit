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

  upload: (file, folder, onProgress) => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads', true);
    xhr.withCredentials = true;

    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(percent);
    };

    xhr.onload = () => {
      const text = xhr.responseText || '';
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(text || `HTTP Error: ${xhr.status}`));
        return;
      }

      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(text);
      }
    };

    xhr.onerror = () => reject(new Error('Upload eșuat. Verifică conexiunea și încearcă din nou.'));
    xhr.onabort = () => reject(new Error('Upload anulat.'));

    xhr.send(formData);
  }),

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

  buildPreviewUrl: (fileName, folder) => {
    const encodedFileName = toEncodedFileName(fileName);
    const query = new URLSearchParams();
    if (folder) query.set('folder', folder);

    const queryString = query.toString();
    return queryString
      ? `${API_BASE}/${encodedFileName}?${queryString}`
      : `${API_BASE}/${encodedFileName}`;
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

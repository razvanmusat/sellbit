import { client } from './client';

const API_BASE = '/api/uploads';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toEncodedFileName = (fileName) => encodeURIComponent(String(fileName || '').trim());
const DOWNLOAD_CHUNK_THRESHOLD = 100 * 1024 * 1024;
const DOWNLOAD_CHUNK_SIZE = 10 * 1024 * 1024;

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

  buildDownloadUrl: (fileName, folder) => {
    const encodedFileName = toEncodedFileName(fileName);
    const query = new URLSearchParams({ download: 'true' });
    if (folder) query.set('folder', folder);
    return `${API_BASE}/${encodedFileName}?${query.toString()}`;
  },

  fetchDownloadBlob: async (fileName, folder, expectedSize) => {
    const encodedFileName = toEncodedFileName(fileName);
    const query = new URLSearchParams({ download: 'true' });
    if (folder) query.set('folder', folder);
    const url = `${API_BASE}/${encodedFileName}?${query.toString()}`;

    const downloadInChunks = async (totalSize) => {
      const parts = [];
      let start = 0;
      let firstContentType = '';

      while (start < totalSize) {
        const end = Math.min(start + DOWNLOAD_CHUNK_SIZE - 1, totalSize - 1);
        const chunkResponse = await fetch(url, {
          method: 'GET',
          headers: {
            ...getAuthHeaders(),
            Range: `bytes=${start}-${end}`
          },
          credentials: 'include'
        });

        if (!chunkResponse.ok) {
          return parseErrorResponse(chunkResponse);
        }

        if (chunkResponse.status === 200) {
          return chunkResponse.blob();
        }

        if (chunkResponse.status !== 206) {
          throw new Error(`HTTP Error: ${chunkResponse.status}`);
        }

        if (!firstContentType) {
          firstContentType = (chunkResponse.headers.get('Content-Type') || '').split(';')[0].trim();
        }

        const part = await chunkResponse.blob();
        parts.push(part);
        start = end + 1;
      }

      return new Blob(parts, { type: firstContentType || 'application/octet-stream' });
    };

    const numericSize = Number(expectedSize || 0);
    if (Number.isFinite(numericSize) && numericSize > DOWNLOAD_CHUNK_THRESHOLD) {
      return downloadInChunks(numericSize);
    }

    const response = await fetch(url, {
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

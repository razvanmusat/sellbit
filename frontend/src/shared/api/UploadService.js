import { client } from './client';

const API_BASE = '/api/uploads';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toEncodedFileName = (fileName) => encodeURIComponent(String(fileName || '').trim());
const DOWNLOAD_CHUNK_THRESHOLD = 100 * 1024 * 1024;
const DOWNLOAD_CHUNK_SIZE = 10 * 1024 * 1024;

const UPLOAD_CHUNK_THRESHOLD = 50 * 1024 * 1024;
const UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;
const UPLOAD_CHUNK_MAX_RETRIES = 3;
const UPLOAD_CHUNK_RETRY_BASE_DELAY_MS = 400;

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
  supportsNativeSavePicker: () => typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function',

  list: async (folder) => {
    if (folder) {
      return client('uploads', { params: { folder } });
    } else {
      return client('uploads');
    }
  },
  upload: async (file, folder, onProgress) => {
    const fileSize = Number(file?.size || 0);
    if (fileSize > UPLOAD_CHUNK_THRESHOLD) {
      return UploadService.uploadChunked(file, folder, onProgress);
    }

    return new Promise((resolve, reject) => {
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
    });
  },

  uploadChunked: async (file, folder, onProgress) => {
    const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_SIZE));
    const uploadId = UploadService.generateUploadId();

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const start = chunkIndex * UPLOAD_CHUNK_SIZE;
      const end = Math.min(start + UPLOAD_CHUNK_SIZE, file.size);
      const chunkBlob = file.slice(start, end);
      const formData = new FormData();

      formData.append('chunk', chunkBlob, file.name);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', String(chunkIndex));
      formData.append('totalChunks', String(totalChunks));
      formData.append('fileName', file.name || 'fisier');
      if (folder) formData.append('folder', folder);

      await UploadService.uploadChunkWithRetry(formData, chunkIndex, totalChunks);

      if (onProgress) {
        const percent = Math.min(99, Math.round(((chunkIndex + 1) / totalChunks) * 100));
        onProgress(percent);
      }
    }

    const completeParams = new URLSearchParams();
    completeParams.set('uploadId', uploadId);
    completeParams.set('totalChunks', String(totalChunks));
    completeParams.set('fileName', file.name || 'fisier');
    if (folder) completeParams.set('folder', folder);

    const completeResponse = await fetch(`/api/uploads/complete?${completeParams.toString()}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!completeResponse.ok) {
      return parseErrorResponse(completeResponse);
    }

    const completedFile = await completeResponse.json();
    if (onProgress) onProgress(100);
    return completedFile;
  },

  generateUploadId: () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    }

    return `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
  },

  uploadChunkWithRetry: async (formData, chunkIndex, totalChunks) => {
    let lastError = null;

    for (let attempt = 0; attempt <= UPLOAD_CHUNK_MAX_RETRIES; attempt += 1) {
      try {
        const response = await fetch('/api/uploads/chunk', {
          method: 'POST',
          headers: getAuthHeaders(),
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          return;
        }

        if (attempt === UPLOAD_CHUNK_MAX_RETRIES) {
          return parseErrorResponse(response);
        }

        lastError = new Error(`HTTP Error: ${response.status}`);
      } catch (error) {
        lastError = error;
        if (attempt === UPLOAD_CHUNK_MAX_RETRIES) {
          break;
        }
      }

      const delay = UPLOAD_CHUNK_RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      await UploadService.sleep(delay);
    }

    throw new Error(
      `Upload chunk eșuat (${chunkIndex + 1}/${totalChunks}). ${lastError?.message || 'Eroare necunoscută.'}`
    );
  },

  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

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

    const detectSizeFromRangeProbe = async () => {
      const probeResponse = await fetch(url, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          Range: 'bytes=0-0'
        },
        credentials: 'include'
      });

      if (!probeResponse.ok) {
        return null;
      }

      if (probeResponse.status !== 206) {
        return null;
      }

      const contentRange = probeResponse.headers.get('Content-Range') || '';
      const totalPart = contentRange.split('/')[1];
      const totalSize = Number(totalPart);

      if (!Number.isFinite(totalSize) || totalSize <= 0) {
        return null;
      }

      return totalSize;
    };

    const numericSize = Number(expectedSize || 0);
    if (Number.isFinite(numericSize) && numericSize > DOWNLOAD_CHUNK_THRESHOLD) {
      return downloadInChunks(numericSize);
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        return parseErrorResponse(response);
      }

      return await response.blob();
    } catch (error) {
      const fallbackSize = Number.isFinite(numericSize) && numericSize > 0
        ? numericSize
        : await detectSizeFromRangeProbe();

      if (Number.isFinite(fallbackSize) && fallbackSize > 0) {
        return downloadInChunks(fallbackSize);
      }

      throw error;
    }
  },

  streamDownloadToFile: async (fileName, folder, suggestedName, expectedSize, onProgress) => {
    if (!UploadService.supportsNativeSavePicker()) {
      throw new Error('BROWSER_SAVE_PICKER_UNSUPPORTED');
    }

    const safeName = (suggestedName || fileName || 'fisier').trim() || 'fisier';
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: safeName,
    });

    const writable = await fileHandle.createWritable();
    const encodedFileName = toEncodedFileName(fileName);
    const query = new URLSearchParams({ download: 'true' });
    if (folder) query.set('folder', folder);
    const url = `${API_BASE}/${encodedFileName}?${query.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (!response.ok) {
        await writable.abort();
        return parseErrorResponse(response);
      }

      const headerSize = Number(response.headers.get('Content-Length') || 0);
      const totalSize = Number.isFinite(headerSize) && headerSize > 0
        ? headerSize
        : Number(expectedSize || 0);

      if (!response.body) {
        const blob = await response.blob();
        await writable.write(blob);
        await writable.close();
        if (onProgress) onProgress(100);
        return;
      }

      const reader = response.body.getReader();
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        await writable.write(value);
        received += value.length;

        if (onProgress && Number.isFinite(totalSize) && totalSize > 0) {
          const percent = Math.min(100, Math.round((received / totalSize) * 100));
          onProgress(percent);
        }
      }

      await writable.close();
      if (onProgress) onProgress(100);
    } catch (error) {
      try {
        await writable.abort();
      } catch {
      }

      if (error?.name === 'AbortError') {
        throw new Error('Download anulat.');
      }

      throw error;
    }
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

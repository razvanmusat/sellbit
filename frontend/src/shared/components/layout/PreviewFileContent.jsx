import React, { useState, useEffect, useRef } from 'react';
import { CircularProgress, Alert, Box, Button } from '@mui/material';
import { UploadService } from '../../api/UploadService';

export default function PreviewFileContent({ file, folder }) {
  const CHUNK_PREVIEW_THRESHOLD = 25 * 1024 * 1024;
  const CHUNK_SIZE = 5 * 1024 * 1024;
  const [blobUrl, setBlobUrl] = useState(null);
  const [blobData, setBlobData] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'webm'];
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mpeg', 'mpg', 'ogv', '3gp', '3g2', 'ts', 'm2ts', 'wmv', 'flv', 'asf', 'mxf'];
  const textExtensions = ['txt', 'csv', 'json', 'xml', 'md', 'log', 'yaml', 'yml'];
  const officeExtensions = ['doc', 'docx', 'docm', 'dot', 'dotx', 'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'ppt', 'pptx', 'pptm', 'pps', 'ppsx'];
  const extension = file?.originalName?.split('.').pop()?.toLowerCase();
  const isImage = Boolean(file?.image) || imageExtensions.includes(extension);
  const isAudio = audioExtensions.includes(extension);
  const isVideo = videoExtensions.includes(extension);
  const isPdf = extension === 'pdf';
  const isText = textExtensions.includes(extension);
  const isOffice = officeExtensions.includes(extension);
  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

  const openBlobInNewTab = () => {
    if (!blobUrl) return;
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadBlob = () => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = file?.originalName || file?.fileName || 'fisier';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    if (!file || !folder) return;
    let isMounted = true;
    let currentUrl = null;
    setLoading(true);
    setError('');
    setBlobUrl(null);
    setBlobData(null);
    setTextContent('');

    const fetchBlobInChunks = async () => {
      const token = localStorage.getItem('token');
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const encodedFileName = encodeURIComponent(String(file.fileName || '').trim());
      const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';
      const previewUrl = `/api/uploads/${encodedFileName}${query}`;

      const firstEnd = CHUNK_SIZE - 1;
      const firstResponse = await fetch(previewUrl, {
        method: 'GET',
        headers: {
          ...authHeaders,
          Range: `bytes=0-${firstEnd}`
        },
        credentials: 'include'
      });

      if (!firstResponse.ok) {
        throw new Error(`Chunk preview failed (${firstResponse.status})`);
      }

      if (firstResponse.status === 200) {
        return firstResponse.blob();
      }

      if (firstResponse.status !== 206) {
        throw new Error(`Chunk preview failed (${firstResponse.status})`);
      }

      const contentType = (firstResponse.headers.get('Content-Type') || '').split(';')[0].trim();
      const contentRange = firstResponse.headers.get('Content-Range') || '';
      const totalPart = contentRange.split('/')[1];
      const totalSize = Number(totalPart);

      if (!Number.isFinite(totalSize) || totalSize <= 0) {
        throw new Error('Chunk preview failed (invalid content-range)');
      }

      const parts = [];
      const firstChunk = await firstResponse.blob();
      parts.push(firstChunk);

      let start = firstChunk.size;
      while (start < totalSize) {
        const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);
        const response = await fetch(previewUrl, {
          method: 'GET',
          headers: {
            ...authHeaders,
            Range: `bytes=${start}-${end}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Chunk preview failed (${response.status})`);
        }

        if (response.status === 200) {
          return response.blob();
        }

        if (response.status !== 206) {
          throw new Error(`Chunk preview failed (${response.status})`);
        }

        const chunk = await response.blob();
        parts.push(chunk);
        start = end + 1;
      }

      const fallbackType = contentType || (isVideo ? 'video/mp4' : 'audio/mpeg');
      return new Blob(parts, { type: fallbackType });
    };

    const fileSize = Number(file?.size || 0);
    const shouldUseChunkPreview = (isVideo || isAudio) && fileSize > CHUNK_PREVIEW_THRESHOLD;

    (shouldUseChunkPreview ? fetchBlobInChunks() : UploadService.fetchPreviewBlob(file.fileName, folder))
      .then(blob => {
        if (!isMounted) return;
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
        setBlobData(blob);
      })
      .catch((previewError) => {
        if (!isMounted) return;
        setError(previewError?.message || 'Nu se poate previzualiza fișierul.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [file, folder, isVideo, isAudio]);

  useEffect(() => {
    if (!blobUrl || !isAudio || !audioRef.current) return;
    const playPromise = audioRef.current.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }, [blobUrl, isAudio]);

  useEffect(() => {
    if (!blobUrl || !isVideo || !videoRef.current) return;
    const playPromise = videoRef.current.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }, [blobUrl, isVideo]);

  useEffect(() => {
    if (!blobData || !isText) return;
    let isMounted = true;
    const maxPreviewSize = 2 * 1024 * 1024;

    if (blobData.size > maxPreviewSize) {
      setTextContent('Fișierul este prea mare pentru previzualizare text.');
      return;
    }

    const decodeText = async () => {
      const buffer = await blobData.arrayBuffer();
      const decoders = ['utf-8', 'windows-1250', 'iso-8859-1'];

      for (const encoding of decoders) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false });
          return decoder.decode(buffer);
        } catch {
          continue;
        }
      }

      return new TextDecoder().decode(buffer);
    };

    decodeText()
      .then((value) => {
        if (!isMounted) return;
        setTextContent(value);
      })
      .catch(() => {
        if (!isMounted) return;
        setTextContent('Nu s-a putut citi conținutul text.');
      });

    return () => {
      isMounted = false;
    };
  }, [blobData, isText]);

  if (loading) return <CircularProgress sx={{ mt: 2 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!blobUrl) return null;

  if (isImage) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <img src={blobUrl} alt={file.originalName} style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8 }} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <audio
          ref={audioRef}
          src={blobUrl}
          controls
          autoPlay
          style={{ width: '100%', maxWidth: 500 }}
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <video
          ref={videoRef}
          src={blobUrl}
          controls
          autoPlay
          playsInline
          style={{ width: '100%', maxWidth: 720, maxHeight: 420, borderRadius: 8 }}
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        title={file.originalName || 'PDF Preview'}
        src={blobUrl}
        style={{ width: '100%', minHeight: 500, border: 'none', borderRadius: 8 }}
      />
    );
  }

  if (isText) {
    return (
      <div style={{ width: '100%', textAlign: 'left' }}>
        <pre
          style={{
            margin: 0,
            padding: 12,
            maxHeight: 500,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.04)'
          }}
        >
          {textContent || 'Se încarcă conținutul text...'}
        </pre>
      </div>
    );
  }

  if (isOffice) {
    return (
      <div style={{ width: '100%' }}>
        <Alert severity="info" sx={{ mt: 2 }}>
          Previzualizarea nativă pentru Word/Excel/PowerPoint diferă între telefon și browser. Pentru compatibilitate mai bună, folosește deschiderea externă sau descarcă fișierul.
        </Alert>
        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={openBlobInNewTab}>Deschide</Button>
          <Button variant="text" onClick={downloadBlob}>Descarcă</Button>
        </Box>
      </div>
    );
  }

  return <Alert severity="info">Previzualizare indisponibilă pentru acest tip de fișier.</Alert>;
}

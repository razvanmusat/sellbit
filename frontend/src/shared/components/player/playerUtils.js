import dayjs from 'dayjs';
import 'dayjs/locale/ro';

export const DAY_LABELS = { 1: 'L', 2: 'Ma', 3: 'Mi', 4: 'J', 5: 'V', 6: 'S', 7: 'D' };

export const MANUAL_LABELS = { stop: 'Oprit manual', pause: 'În pauză', play: 'Pornit manual', party: 'Petrecere pornită manual' };

// Fișierele stocate au forma UUID__nume.ext; afișăm doar numele.
export const shortName = (fileName) => {
  const value = String(fileName || '');
  const index = value.indexOf('__');
  return index >= 0 ? value.slice(index + 2) : value;
};

export const fileLabel = (file) => file.originalName || shortName(file.fileName);

export const splitExtension = (name) => {
  const value = String(name || '');
  const index = value.lastIndexOf('.');
  return index > 0 ? { base: value.slice(0, index), ext: value.slice(index) } : { base: value, ext: '' };
};

// Fiecare fișier e într-un folder (după nume).
export const filesInFolder = (files, assignments, folder) => files.filter((file) => assignments[file.fileName] === folder);

// Folderul cu care se deschide o listă: al fișierului ales; altfel primul folder care are fișiere; altfel primul folder.
export const initialFolder = (files, folders, assignments, currentValue) => {
  if (currentValue && assignments[currentValue]) return assignments[currentValue];
  return folders.find((folder) => filesInFolder(files, assignments, folder).length > 0) || folders[0] || null;
};

export const formatSize = (bytes) => {
  const size = Number(bytes || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
};

export const targetLabel = (target) => {
  if (typeof target === 'string' && target.startsWith('party:')) return `Petrecere ${target.slice(6)}`;
  if (target === 'default') return 'Program implicit';
  return 'Nimic programat';
};

// Valorile din stare rămân text: data 'YYYY-MM-DD', ora 'HH:mm' (formatul așteptat de backend).
export const toDate = (value) => (value ? dayjs(value) : null);
export const toTime = (value) => (value ? dayjs(`2000-01-01T${value}`) : null);

// Câmp golit -> ''. Valoare parțială (încă se tastează) -> ignorată, ca să nu se piardă ce scrie utilizatorul.
export const pickerChange = (format, apply) => (value) => {
  if (value === null) apply('');
  else if (value.isValid()) apply(value.format(format));
};

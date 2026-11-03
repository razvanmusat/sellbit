import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PlayerService } from '../api/PlayerService';
import { UploadService } from '../api/UploadService';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

export const PLAYER_FOLDER = 'player';
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const TOAST_MS = 4000;

const STATUS_POLL_MS = 5000;
const SYNC_POLL_MS = 1500;
const SYNC_WAIT_MS = 15 * 60 * 1000; // agentul oprește un transfer după 900 s
const SYNC_MAX_STATUS_FAILURES = 5;
const REJECTED_PREFIX = 'ERROR.PLAYER.COMMAND_REJECTED|';

const COMMAND_LABELS = {
  play: 'Play trimis.',
  pause: 'Pauză trimisă.',
  stop: 'Stop trimis.',
  next: 'Următorul fișier trimis.',
};

const EMPTY_PROGRAM = { open: '', close: '', stopImages: [], defaultClips: [], parties: [] };

// program.json și fișierele temporare nu sunt clipuri, nu le arătăm în listă.
const isHiddenFile = (file) => file.fileName === 'program.json' || file.fileName.startsWith('.');

// Fiecare rând din program primește un id stabil (cheie React și țintă la drag & drop).
let idCounter = 0;
const newId = () => {
  idCounter += 1;
  return `row-${idCounter}`;
};

// Pozele se setează în minute în interfață; agentul primește secunde.
const secondsToMinutes = (seconds) => {
  if (seconds === undefined || seconds === null || seconds === '') return '';
  return Number((Number(seconds) / 60).toFixed(2));
};

const minutesToSeconds = (minutes) => {
  if (minutes === '' || minutes === null || minutes === undefined) return undefined;
  const parsed = Number(minutes);
  return Number.isNaN(parsed) ? undefined : Math.round(parsed * 60);
};

// Petrecerea se scrie în interfață cu oră de început și oră de sfârșit; agentul primește începutul și durata în minute.
const timeToMinutes = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const minutesToTime = (total) => {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

// Durata dintre început și sfârșit; dacă sfârșitul e mai mic, petrecerea trece peste miezul nopții.
// Intoarce null dacă o oră lipsește sau cele două ore sunt la fel.
export const partyDurationMinutes = (start, end) => {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  if (from === null || to === null || from === to) return null;
  return (to - from + 1440) % 1440;
};

export const crossesMidnight = (start, end) => {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  return from !== null && to !== null && to < from;
};

// Petrecerile se ordonează crescător: după zi, apoi după ora de început (la egalitate, după ora de sfârșit).
// Cele fără oră completată (încă în lucru) vin ultimele în zi. Sortarea e stabilă.
const timeKey = (value) => value || '99:99';
export const compareParties = (a, b) => (
  String(a.date || '').localeCompare(String(b.date || ''))
  || timeKey(a.start).localeCompare(timeKey(b.start))
  || timeKey(a.end).localeCompare(timeKey(b.end))
);

// Id-ul petrecerii pe care îl cunoaște agentul: data și ora de început.
export const partyId = (party) => `${party.date} ${party.start}`;

const partySignature = (party) => JSON.stringify([party.date, party.start, party.end, party.files.map((file) => file.file)]);

export const displayDate = (value) => String(value || '').split('-').reverse().join('.');

// Ordinea de pe ecran = ordinea din listă. Programul salvat are încă `order`: îl folosim doar la încărcare.
const orderValue = (value) => {
  const parsed = Number(value);
  return value === undefined || value === null || Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
};

const sortByOrder = (list) => list
  .map((item, index) => ({ item, index }))
  .sort((a, b) => (orderValue(a.item.order) - orderValue(b.item.order)) || (a.index - b.index))
  .map(({ item }) => item);

export const moveItem = (list, from, to) => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

// După o redenumire, referințele din starea locală (inclusiv cele nesalvate) trec pe noul nume.
export const renameReferences = (program, oldName, newName) => ({
  ...program,
  stopImages: program.stopImages.map((item) => (item.file === oldName ? { ...item, file: newName } : item)),
  defaultClips: program.defaultClips.map((item) => (item.file === oldName ? { ...item, file: newName } : item)),
  parties: program.parties.map((party) => ({
    ...party,
    files: party.files.map((file) => (file.file === oldName ? { ...file, file: newName } : file)),
  })),
});

const endTime = (start, durationMinutes) => {
  const from = timeToMinutes(start);
  const duration = Number(durationMinutes);
  return from !== null && Number.isFinite(duration) && duration > 0 ? minutesToTime(from + duration) : '';
};

export const toEditable = (program) => ({
  open: program?.open || '',
  close: program?.close || '',
  // pozele de fundal: lista stopImages, sau (program vechi) o singură poză stopImage; secunde pe ecran direct în secunde
  stopImages: (program?.stopImages?.length
    ? program.stopImages
    : (program?.stopImage ? [{ file: program.stopImage }] : [])
  ).map((item) => ({ id: newId(), file: item.file || '', seconds: item.imageSeconds ? String(item.imageSeconds) : '' })),
  defaultClips: sortByOrder(program?.default || []).map((item) => ({
    id: newId(),
    file: item.file || '',
    days: item.days || [...ALL_DAYS],
    imageMinutes: secondsToMinutes(item.imageSeconds),
  })),
  parties: [...(program?.parties || [])].sort(compareParties).map((party) => ({
    id: newId(),
    date: party.date || '',
    start: party.start || '',
    end: endTime(party.start, party.durationMinutes),
    files: sortByOrder(party.files || []).map((file) => ({
      id: newId(),
      file: file.file || '',
      imageMinutes: secondsToMinutes(file.imageSeconds),
    })),
  })),
});

// Durata pe ecran are sens doar la poze; la video nu o trimitem.
const secondsFor = (fileName, minutes, filesByName) => {
  const known = filesByName.get(fileName);
  if (known && !known.image) return undefined;
  return minutesToSeconds(minutes);
};

// `order` se calculează din poziția în listă (1, 2, 3...).
export const toPayload = (program, filesByName) => ({
  open: program.open,
  close: program.close,
  // cu o singură poză, secundele nu contează (rămâne permanent) și nu se trimit
  stopImages: program.stopImages.length
    ? program.stopImages.map((item) => ({
      file: item.file,
      imageSeconds: program.stopImages.length > 1 && Number(item.seconds) > 0 ? Number(item.seconds) : undefined,
    }))
    : undefined,
  default: program.defaultClips.map((item, index) => ({
    file: item.file,
    days: item.days,
    order: index + 1,
    imageSeconds: secondsFor(item.file, item.imageMinutes, filesByName),
  })),
  parties: [...program.parties].sort(compareParties).map((party) => ({
    date: party.date,
    start: party.start,
    durationMinutes: partyDurationMinutes(party.start, party.end) ?? undefined,
    files: party.files.map((file, index) => ({
      file: file.file,
      order: index + 1,
      imageSeconds: secondsFor(file.file, file.imageMinutes, filesByName),
    })),
  })),
});

// Identifică o rulare de sync: contorul `seq`, dacă agentul îl trimite, altfel ora (rezoluție de o secundă).
const syncMarker = (lastSync) => lastSync?.seq ?? lastSync?.time ?? null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const replaceAt = (list, index, patch) =>
  list.map((item, i) => (i === index ? { ...item, ...patch } : item));

const removeAt = (list, index) => list.filter((_, i) => i !== index);

export function usePlayer() {
  const [files, setFiles] = useState([]);
  // Foldere de organizare (doar în Sellbit): lista lor și în ce folder e fiecare fișier. Orice fișier e într-un folder.
  const [folders, setFolders] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [program, setProgram] = useState(EMPTY_PROGRAM);
  // Petrecerile așa cum sunt salvate pe server: „Pornește acum” merge doar pe cele salvate (agentul le cunoaște din program).
  const [savedParties, setSavedParties] = useState([]);
  const [status, setStatus] = useState(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commandBusy, setCommandBusy] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ active: false, percent: 0, fileName: '', index: 0, total: 0 });
  // `key` se schimbă la fiecare mesaj: Snackbar-ul vechi dispare imediat, iar cel nou pornește cu cele 4 secunde ale lui.
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info', key: 0 });
  // null | { phase: 'waiting' } | { phase: 'done', ok, message, failed, files }
  const syncToken = useRef(0);

  const filesByName = useMemo(() => new Map(files.map((file) => [file.fileName, file])), [files]);
  const savedSignatures = useMemo(() => new Set(savedParties.map(partySignature)), [savedParties]);
  const isPartySaved = (party) => !!party.date && !!party.start && savedSignatures.has(partySignature(party));

  const notify = useCallback((message, severity = 'success') => {
    setToast((prev) => ({ open: true, message, severity, key: prev.key + 1 }));
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  const showError = useCallback((error) => {
    const raw = String(error?.message || '');
    if (raw.startsWith(REJECTED_PREFIX)) {
      const reason = raw.slice(REJECTED_PREFIX.length).trim();
      notify(reason ? `Comanda a fost refuzată: ${reason}` : getFriendlyErrorMessage(REJECTED_PREFIX.slice(0, -1)), 'error');
      return;
    }
    notify(getFriendlyErrorMessage(error), 'error');
  }, [notify]);

  const applyFolders = useCallback((state) => {
    setFolders(Array.isArray(state?.folders) ? state.folders : []);
    setAssignments(state?.assignments && typeof state.assignments === 'object' ? state.assignments : {});
  }, []);

  const loadFolders = useCallback(async () => {
    applyFolders(await PlayerService.getFolders());
  }, [applyFolders]);

  const loadFiles = useCallback(async () => {
    const result = await UploadService.list(PLAYER_FOLDER);
    setFiles((Array.isArray(result) ? result : []).filter((file) => !isHiddenFile(file)));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // getProgram creează folderul player pe server, de aceea vine înaintea listării.
      const loaded = await PlayerService.getProgram();
      const editable = toEditable(loaded);
      setProgram(editable);
      setSavedParties(editable.parties);
      await loadFiles();
      await loadFolders();
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }, [loadFiles, loadFolders, showError]);

  const refreshStatus = useCallback(async () => {
    try {
      const current = await PlayerService.status();
      setStatus(current);
      setOffline(false);
    } catch {
      setStatus(null);
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // La ieșirea din pagină se oprește orice așteptare de sincronizare rămasă.
  useEffect(() => () => {
    syncToken.current += 1;
  }, []);

  useEffect(() => {
    refreshStatus();
    const timer = setInterval(refreshStatus, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [refreshStatus]);

  // ---- comenzi

  const sendCommand = async (command) => {
    setCommandBusy(command);
    try {
      await PlayerService.command(command);
      notify(COMMAND_LABELS[command] || 'Comandă trimisă.');
      await refreshStatus();
    } catch (error) {
      showError(error);
    } finally {
      setCommandBusy('');
    }
  };

  // Pornește petrecerea acum, indiferent de oră (și după ora de sfârșit). Rulează până la Stop sau schimbarea programului.
  const startParty = async (party) => {
    setCommandBusy('party');
    try {
      await PlayerService.startParty(partyId(party));
      notify('Petrecerea a fost pornită.');
      await refreshStatus();
    } catch (error) {
      showError(error);
    } finally {
      setCommandBusy('');
    }
  };

  // Rulează acum fișiere alese din foldere, fără să fie adăugate în program: items = [{ file, imageSeconds? }].
  // Întoarce true dacă agentul a acceptat comanda.
  const startQuick = async (items) => {
    setCommandBusy('quick');
    try {
      await PlayerService.quickRun(items);
      notify('Rularea a pornit. Fișierele care nu erau pe player se descarcă întâi.');
      await refreshStatus();
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      setCommandBusy('');
    }
  };

  // ---- sincronizare (după salvare sau redenumire)

  // Citește markerul ultimului sync ÎNAINTE de salvare: sincronizarea e gata când syncing e false
  // și markerul s-a schimbat, sau când am văzut syncing=true și apoi false
  // (ora are rezoluție de o secundă, deci două sync-uri în aceeași secundă au aceeași oră).
  const readSyncBaseline = async () => {
    try {
      const current = await PlayerService.status();
      return { known: true, marker: syncMarker(current?.last_sync) };
    } catch {
      return { known: false, marker: null };
    }
  };

  const awaitSync = async (baselineMarker, token) => {
    const deadline = Date.now() + SYNC_WAIT_MS;
    let failures = 0;
    let sawSyncing = false;

    while (Date.now() < deadline) {
      await sleep(SYNC_POLL_MS);
      if (syncToken.current !== token) return;

      try {
        const current = await PlayerService.status();
        if (syncToken.current !== token) return;
        failures = 0;
        setStatus(current);
        setOffline(false);

        if (current?.syncing) sawSyncing = true;

        const last = current?.last_sync;
        if (!current?.syncing && last && (sawSyncing || syncMarker(last) !== baselineMarker)) {
          const failed = Array.isArray(last.failed) ? last.failed : [];
          if (last.ok === true) {
            notify(`Programul este aplicat pe player${typeof last.files === 'number' ? ` (${last.files} fișiere)` : ''}.${failed.length ? ` Fișiere netrase: ${failed.join(', ')}` : ''}`);
          } else {
            notify(`Sincronizarea nu s-a încheiat cu succes: ${last.message || ''}${failed.length ? ` Fișiere netrase: ${failed.join(', ')}` : ''}`, 'warning');
          }
          return;
        }
      } catch {
        failures += 1;
        if (failures >= SYNC_MAX_STATUS_FAILURES) {
          if (syncToken.current !== token) return;
          setOffline(true);
          notify('Playerul nu mai răspunde, nu pot confirma sincronizarea.', 'warning');
          return;
        }
      }
    }

    if (syncToken.current !== token) return;
    notify('Sincronizarea durează prea mult, nu pot confirma rezultatul.', 'warning');
  };

  // ---- fișiere

  // `folder`: numele folderului în care intră fișierele încărcate (obligatoriu).
  const uploadFiles = async (fileList, folder) => {
    const list = Array.from(fileList || []);
    if (list.length === 0) return;
    if (!folder) {
      notify('Creează un folder și alege-l înainte să încarci fișiere.', 'error');
      return;
    }

    let allOk = true;
    for (let i = 0; i < list.length; i += 1) {
      const file = list[i];
      setUploadProgress({ active: true, percent: 0, fileName: file.name, index: i + 1, total: list.length });
      try {
        const uploaded = await UploadService.upload(file, PLAYER_FOLDER, (percent) => {
          setUploadProgress((prev) => ({ ...prev, percent }));
        });
        if (uploaded?.fileName) {
          try {
            applyFolders(await PlayerService.assignFile(uploaded.fileName, folder));
          } catch (error) {
            showError(error); // fișierul e încărcat; serverul îl pune în primul folder dacă atribuirea a eșuat
          }
        }
      } catch (error) {
        allOk = false;
        showError(error);
        break;
      }
    }

    setUploadProgress({ active: false, percent: 0, fileName: '', index: 0, total: 0 });
    try {
      await loadFiles();
      await loadFolders();
    } catch (error) {
      showError(error);
    }
    if (allOk) notify(list.length === 1 ? 'Fișier încărcat!' : `${list.length} fișiere încărcate!`);
  };

  const deleteFile = async (file) => {
    try {
      await UploadService.delete(file.fileName, PLAYER_FOLDER);
      await loadFiles();
      await loadFolders();
      notify('Fișier șters! Dacă era folosit în program, scoate-l din program și salvează.', 'warning');
    } catch (error) {
      showError(error);
    }
  };

  // Redenumește fișierul (prefixul UUID și extensia rămân). Serverul actualizează și program.json.
  // Întoarce true dacă redenumirea a reușit.
  const renameFile = async (file, newName) => {
    try {
      const baseline = await readSyncBaseline();
      const result = await PlayerService.renameFile(file.fileName, String(newName || '').trim());
      setProgram((prev) => renameReferences(prev, file.fileName, result.fileName));
      setSavedParties((prev) => renameReferences({ stopImages: [], defaultClips: [], parties: prev }, file.fileName, result.fileName).parties);
      await loadFiles();
      await loadFolders();

      if (!result.programUpdated) {
        notify('Fișier redenumit.');
      } else if (!result.synced) {
        notify(
          `Fișier redenumit și program actualizat. Playerul nu a răspuns (${getFriendlyErrorMessage(result.message)}). Îl preia singur la următoarea conectare.`,
          'warning'
        );
      } else if (!baseline.known) {
        notify('Fișier redenumit, program actualizat și trimis. Nu pot confirma aplicarea.', 'warning');
      } else {
        syncToken.current += 1;
        notify('Fișier redenumit. Se actualizează programul pe player...', 'info');
        awaitSync(baseline.marker, syncToken.current).catch(() => {});
      }
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };

  // ---- foldere (organizare)

  const runFolderAction = async (action, successMessage, severity = 'success') => {
    try {
      applyFolders(await action());
      if (successMessage) notify(successMessage, severity);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };

  const createFolder = (name) => runFolderAction(() => PlayerService.createFolder(name), 'Folder creat.');
  const renameFolder = (name, newName) => runFolderAction(() => PlayerService.renameFolder(name, newName), 'Folder redenumit.');
  const deleteFolder = (name) => runFolderAction(() => PlayerService.deleteFolder(name), 'Folder șters.');
  const moveFile = (file, folder) => runFolderAction(
    () => PlayerService.assignFile(file.fileName, folder),
    `Fișier mutat în „${folder}”.`
  );

  // ---- program

  const setProgramField = (key, value) => setProgram((prev) => ({ ...prev, [key]: value }));

  const addStopImage = () => setProgram((prev) => ({ ...prev, stopImages: [...prev.stopImages, { id: newId(), file: '', seconds: '' }] }));
  const updateStopImage = (index, patch) => setProgram((prev) => ({ ...prev, stopImages: replaceAt(prev.stopImages, index, patch) }));
  const removeStopImage = (index) => setProgram((prev) => ({ ...prev, stopImages: removeAt(prev.stopImages, index) }));
  const moveStopImage = (from, to) => setProgram((prev) => ({ ...prev, stopImages: moveItem(prev.stopImages, from, to) }));

  const addDefault = () => setProgram((prev) => ({
    ...prev,
    defaultClips: [...prev.defaultClips, { id: newId(), file: '', days: [...ALL_DAYS], imageMinutes: '' }],
  }));
  const updateDefault = (index, patch) => setProgram((prev) => ({ ...prev, defaultClips: replaceAt(prev.defaultClips, index, patch) }));
  const removeDefault = (index) => setProgram((prev) => ({ ...prev, defaultClips: removeAt(prev.defaultClips, index) }));
  const moveDefault = (from, to) => setProgram((prev) => ({ ...prev, defaultClips: moveItem(prev.defaultClips, from, to) }));

  // Petrecerea completată în modala „Adaugă petrecere”: { date, start, end, files: [{ file, imageMinutes }] }.
  const addParty = (party) => setProgram((prev) => ({
    ...prev,
    parties: [...prev.parties, {
      id: newId(),
      date: party.date,
      start: party.start,
      end: party.end,
      files: party.files.map((file) => ({ id: newId(), file: file.file, imageMinutes: file.imageMinutes || '' })),
    }],
  }));
  const updateParty = (index, patch) => setProgram((prev) => ({ ...prev, parties: replaceAt(prev.parties, index, patch) }));
  const removeParty = (index) => setProgram((prev) => ({ ...prev, parties: removeAt(prev.parties, index) }));

  const mapParty = (partyIndex, change) => setProgram((prev) => ({
    ...prev,
    parties: prev.parties.map((party, i) => (i === partyIndex ? change(party) : party)),
  }));
  const addPartyFile = (partyIndex) => mapParty(partyIndex, (party) => ({
    ...party,
    files: [...party.files, { id: newId(), file: '', imageMinutes: '' }],
  }));
  const updatePartyFile = (partyIndex, fileIndex, patch) => mapParty(partyIndex, (party) => ({
    ...party,
    files: replaceAt(party.files, fileIndex, patch),
  }));
  const removePartyFile = (partyIndex, fileIndex) => mapParty(partyIndex, (party) => ({
    ...party,
    files: removeAt(party.files, fileIndex),
  }));
  const movePartyFile = (partyIndex, from, to) => mapParty(partyIndex, (party) => ({
    ...party,
    files: moveItem(party.files, from, to),
  }));

  // Mesaj pentru prima petrecere cu date incomplete, sau null.
  const partyProblem = () => {
    for (let i = 0; i < program.parties.length; i += 1) {
      const party = program.parties[i];
      const label = `Petrecerea ${i + 1}${party.date ? ` (${displayDate(party.date)})` : ''}`;
      if (!party.date) return `${label}: alege data.`;
      if (!party.start) return `${label}: alege ora de început.`;
      if (!party.end) return `${label}: alege ora de sfârșit.`;
      if (partyDurationMinutes(party.start, party.end) === null) return `${label}: ora de sfârșit trebuie să fie diferită de ora de început.`;
    }
    return null;
  };

  const saveProgram = async () => {
    const problem = partyProblem();
    if (problem) {
      notify(problem, 'error');
      return;
    }
    setSaving(true);
    let waitFor = null;
    try {
      const baseline = await readSyncBaseline();
      const result = await PlayerService.saveProgram(toPayload(program, filesByName));
      const reloaded = toEditable(await PlayerService.getProgram());
      setProgram(reloaded);
      setSavedParties(reloaded.parties);

      if (!result?.synced) {
        syncToken.current += 1;
        notify(
          `Program salvat. Playerul nu a răspuns (${getFriendlyErrorMessage(result?.message)}). Îl preia singur la următoarea conectare.`,
          'warning'
        );
      } else if (!baseline.known) {
        syncToken.current += 1;
        notify('Program salvat și trimis. Nu pot confirma aplicarea: starea playerului nu a răspuns înainte de salvare.', 'warning');
      } else {
        syncToken.current += 1;
        waitFor = { baselineMarker: baseline.marker, token: syncToken.current };
        notify('Program salvat. Se sincronizează cu playerul...', 'info');
      }
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }

    if (waitFor) {
      await awaitSync(waitFor.baselineMarker, waitFor.token);
    }
  };

  const library = useMemo(() => ({ files, folders, assignments }), [files, folders, assignments]);

  return {
    files, filesByName, library, folders, assignments, program, status, offline,
    loading, saving, commandBusy, uploadProgress,
    toast, closeToast,
    reload, sendCommand, startParty, startQuick, isPartySaved, uploadFiles, deleteFile, renameFile,
    createFolder, renameFolder, deleteFolder, moveFile,
    setProgramField,
    addStopImage, updateStopImage, removeStopImage, moveStopImage,
    addDefault, updateDefault, removeDefault, moveDefault,
    addParty, updateParty, removeParty,
    addPartyFile, updatePartyFile, removePartyFile, movePartyFile,
    saveProgram,
  };
}

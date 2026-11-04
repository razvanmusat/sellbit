import React, { useEffect, useRef, useState } from 'react';
import { PlayerService } from '../../api/PlayerService';
import { STATUS_POLL_MS } from '../../hooks/usePlayer';
import PlaybackErrorDialog from './PlaybackErrorDialog';

// Montat o singură dată în aplicație (cât ești logat): citește starea playerului la fiecare STATUS_POLL_MS și, când agentul
// raportează o eroare de redare nouă (playback_error: { id, file, message }), arată fereastra cu butonul OK, pe orice ecran.
// seenErrorId: null = prima stare încă nevăzută (o eroare mai veche decât momentul în care ai intrat nu se afișează).
const PlaybackErrorWatcher = () => {
  const [error, setError] = useState(null);
  const seenErrorId = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      let status;
      try {
        status = await PlayerService.status();
      } catch {
        return;   // playerul nu răspunde: nu e eroare de redare
      }
      if (cancelled || !status) return;
      const current = status.playback_error;
      if (seenErrorId.current === null) {
        seenErrorId.current = current?.id ?? 0;
      } else if (!current) {
        seenErrorId.current = 0;   // agentul a repornit (contorul lui începe din nou)
      } else if (current.id !== seenErrorId.current) {
        seenErrorId.current = current.id;
        setError(current);
      }
    };

    check();
    const timer = setInterval(check, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return <PlaybackErrorDialog error={error} onClose={() => setError(null)} />;
};

export default PlaybackErrorWatcher;

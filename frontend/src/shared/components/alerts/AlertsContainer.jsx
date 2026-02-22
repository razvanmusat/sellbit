import React, { useState, useEffect } from 'react';
import AlertBell from './AlertBell';
import AlertsModal from './AlertsModal';
import { useAlerts } from '../../hooks/useAlerts';

const AUTO_OPEN_SESSION_KEY = 'sellbit_alerts_auto_opened';

const AlertsContainer = () => {
  const { unclosedAlerts, expirationAlerts, totalAlerts, loading, refreshAlerts } = useAlerts();
  const [openModal, setOpenModal] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Deschide modala automat o singură dată per sesiune (nu la schimbare casier/admin)
  useEffect(() => {
    if (loading) return;

    const alreadyAutoOpened = sessionStorage.getItem(AUTO_OPEN_SESSION_KEY) === '1';
    if (alreadyAutoOpened) return;

    if (totalAlerts > 0) {
      setOpenModal(true);
    }

    sessionStorage.setItem(AUTO_OPEN_SESSION_KEY, '1');
  }, [loading, totalAlerts]);

  // Clopotelul clipește dacă sunt alerte nerezolvate
  useEffect(() => {
    setIsBlinking(totalAlerts > 0);
  }, [totalAlerts]);

  const handleOpenModal = () => {
    refreshAlerts(); // Refresh datele cand deschide clopotelul
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleAlertResolved = () => {
    // Refresh alerte după ce user-ul a rezolvat o alertă
    refreshAlerts();
  };

  return (
    <>
      <AlertBell
        totalAlerts={totalAlerts}
        onClick={handleOpenModal}
        isBlinking={isBlinking}
      />
      <AlertsModal
        open={openModal}
        onClose={handleCloseModal}
        unclosedAlerts={unclosedAlerts}
        expirationAlerts={expirationAlerts}
        onResolved={handleAlertResolved}
      />
    </>
  );
};

export default AlertsContainer;

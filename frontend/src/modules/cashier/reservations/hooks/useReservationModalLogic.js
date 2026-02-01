import { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';

export const useReservationModalLogic = ({ open, editData, selectedDate, onSubmit }) => {
  
  // --- A. STATE ---
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [advancePaid, setAdvancePaid] = useState(null); 
  const [digitalInvitation, setDigitalInvitation] = useState(null);
  const [errors, setErrors] = useState({});

  // --- B. REFS ---
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const amountRef = useRef(null);
  const themeRef = useRef(null);
  const noteRef = useRef(null);

  // --- POPULARE DATE ---
  useEffect(() => {
    if (open) {
      if (editData) {        
        setStartTime(dayjs(editData.startAt));
        setEndTime(dayjs(editData.endAt));
        
        const hasAdvance = Number(editData.advanceAmount) > 0;
        setAdvancePaid(hasAdvance);
        setDigitalInvitation(!!editData.digitalInvitation);
      } else {
        const baseDate = selectedDate || dayjs();
        const initialStart = baseDate.startOf('day'); 
        setStartTime(initialStart);
        setEndTime(initialStart.add(2.5, 'hour'));
        setAdvancePaid(null);
        setDigitalInvitation(null);
      }
      setErrors({});

      setTimeout(() => {
        if (nameRef.current) nameRef.current.value = editData?.parentName || '';
        if (themeRef.current) themeRef.current.value = editData?.theme || '';
        if (noteRef.current) noteRef.current.value = editData?.note || '';
        if (amountRef.current && editData?.advanceAmount) {
            amountRef.current.value = editData.advanceAmount;
        }
        if (phoneRef.current) {
            phoneRef.current.setValue(editData?.parentPhone || '');
        }
      }, 0);
    } else {
      setErrors({});
      setStartTime(null);
      setEndTime(null);
      setAdvancePaid(null);
      setDigitalInvitation(null);
    }
  }, [open, editData, selectedDate]);

  // --- HANDLERS ---

  // 1. Schimbare ORA (păstrează data curentă din state)
  const handleTimeChange = useCallback((newTime) => {
    if (!newTime) {
        setStartTime(null);
        setEndTime(null);
        return;
    }
    // Luăm data din startTime-ul curent (sau selectedDate dacă e null)
    const currentDate = startTime || selectedDate || dayjs();
    
    const combinedStart = currentDate
        .hour(newTime.hour())
        .minute(newTime.minute());

    setStartTime(combinedStart);
    setEndTime(combinedStart.add(2.5, 'hour'));
  }, [selectedDate, startTime]);

  // 2. Schimbare DATA (NOU - păstrează ora curentă)
  const handleDateChange = useCallback((newDate) => {
    if (!newDate || !newDate.isValid()) return;

    setStartTime(prevStart => {
        const base = prevStart || dayjs().startOf('day');
        return base.year(newDate.year()).month(newDate.month()).date(newDate.date());
    });

    setEndTime(prevEnd => {
        if (!prevEnd) return null;
        return prevEnd.year(newDate.year()).month(newDate.month()).date(newDate.date());
    });
  }, []);

  const handleSubmit = () => {
     const newErrors = {};

     const nameVal = nameRef.current?.value || '';
     const themeVal = themeRef.current?.value || '';
     const noteVal = noteRef.current?.value || '';
     const amountVal = amountRef.current?.value || '';
     const phoneVal = phoneRef.current?.getValue() || ''; 

     if (!startTime || !startTime.isValid()) newErrors.startAt = "Ora obligatorie.";
     if (!nameVal.trim()) newErrors.parentName = "Nume obligatoriu.";
     
     if (!phoneVal) newErrors.parentPhone = "Telefon obligatoriu.";
     else if (phoneVal.startsWith('00')) {
         if (phoneVal.length < 5) newErrors.parentPhone = "Nr. invalid.";
     } else {
         if (phoneVal.length < 10) newErrors.parentPhone = "Fix 10 cifre.";
     }

     if (advancePaid === null) newErrors.advancePaid = "Selectează avans.";
     if (digitalInvitation === null) newErrors.digitalInvitation = "Selectează invitație.";
     
     if (advancePaid === true && (!amountVal || Number(amountVal) <= 0)) {
         newErrors.advanceValue = "Sumă?";
     }

     if (Object.keys(newErrors).length > 0) {
       setErrors(newErrors);
       return;
     }

     const payload = {
       startAt: startTime.format('YYYY-MM-DDTHH:mm:ss'), 
       endAt: endTime.format('YYYY-MM-DDTHH:mm:ss'),
       parentName: nameVal,
       parentPhone: phoneVal, 
       advanceAmount: advancePaid ? Number(amountVal) : 0, 
       digitalInvitation,
       theme: themeVal,
       note: noteVal
     };

     onSubmit(payload);
  };

  return {
    startTime, endTime, advancePaid, digitalInvitation, errors,
    nameRef, amountRef, themeRef, noteRef, phoneRef, 
    setAdvancePaid, setDigitalInvitation,
    handleTimeChange, handleDateChange, handleSubmit // Exportăm și handleDateChange
  };
};
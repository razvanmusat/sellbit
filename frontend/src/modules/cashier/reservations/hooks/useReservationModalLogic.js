import { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';

export const useReservationModalLogic = ({ open, editData, selectedDate, onSubmit }) => {
  
  // --- A. STATE ---
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [advancePaid, setAdvancePaid] = useState(null); 
  const [digitalInvitation, setDigitalInvitation] = useState(null);
  const [digitalInvitationTouched, setDigitalInvitationTouched] = useState(false);
  const [errors, setErrors] = useState({});

  // --- B. REFS ---  
  const childNameRef = useRef(null);
  const childAgeRef = useRef(null);
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
        setDigitalInvitation(editData.digitalInvitation ?? null);
        setDigitalInvitationTouched(true);
      } else {
        const baseDate = selectedDate || dayjs();
        const initialStart = baseDate.startOf('day'); 
        setStartTime(initialStart);
        setEndTime(initialStart.add(2.5, 'hour'));
        setAdvancePaid(null);
        setDigitalInvitation(null);
        setDigitalInvitationTouched(false);
      }
      setErrors({});

      setTimeout(() => {        
        if (editData?.parentName) {          
          const match = editData.parentName.match(/^(.*?),\s*(\d{1,2})\s*ani\s*$/i);
          if (match) {
            if (childNameRef.current) childNameRef.current.value = match[1].trim();
            if (childAgeRef.current) childAgeRef.current.value = match[2].trim();
          } else {            
            if (childNameRef.current) childNameRef.current.value = editData.parentName.trim();
            if (childAgeRef.current) childAgeRef.current.value = '';
          }
        } else {
          if (childNameRef.current) childNameRef.current.value = '';
          if (childAgeRef.current) childAgeRef.current.value = '';
        }
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
      setDigitalInvitationTouched(false);
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

     const childNameVal = childNameRef.current?.value || '';
     const childAgeVal = childAgeRef.current?.value || '';
     const themeVal = themeRef.current?.value || '';
     const noteVal = noteRef.current?.value || '';
     const amountVal = amountRef.current?.value || '';
     const phoneVal = phoneRef.current?.getValue() || '';

     if (!startTime || !startTime.isValid()) newErrors.startAt = "Ora obligatorie.";
     if (!childNameVal.trim()) newErrors.childName = "Nume copil obligatoriu.";
     if (!childAgeVal.trim()) newErrors.childAge = "Vârsta este obligatorie.";
     else if (!/^[0-9]+$/.test(childAgeVal) || Number(childAgeVal) < 1 || Number(childAgeVal) > 18) newErrors.childAge = "Vârstă invalidă (1-18).";

     if (!phoneVal) newErrors.parentPhone = "Telefon obligatoriu.";
     else if (phoneVal.startsWith('00')) {
         if (phoneVal.length < 5) newErrors.parentPhone = "Nr. invalid.";
     } else {
         if (phoneVal.length < 10) newErrors.parentPhone = "Fix 10 cifre.";
     }

     if (advancePaid === null) newErrors.advancePaid = "Selectează avans.";
     if (advancePaid === true && (!amountVal || Number(amountVal) <= 0)) {
         newErrors.advanceValue = "Sumă?";
     }

     if (Object.keys(newErrors).length > 0) {
       setErrors(newErrors);
       return;
     }

     // Concatenează pentru backend
     const parentName = `${childNameVal.trim()}, ${childAgeVal.trim()} ani`;

     const payload = {
       startAt: startTime.format('YYYY-MM-DDTHH:mm:ss'), 
       endAt: endTime.format('YYYY-MM-DDTHH:mm:ss'),
       parentName,
       parentPhone: phoneVal, 
       advanceAmount: advancePaid ? Number(amountVal) : 0, 
       digitalInvitation,
       theme: themeVal,
       note: noteVal
     };

     onSubmit(payload);
  };

  return {
    startTime, endTime, advancePaid, digitalInvitation, digitalInvitationTouched, errors,
    childNameRef, childAgeRef, amountRef, themeRef, noteRef, phoneRef, 
    setAdvancePaid, setDigitalInvitation, setDigitalInvitationTouched,
    handleTimeChange, handleDateChange, handleSubmit
  };
};
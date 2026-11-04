// Explicațiile din ferestrele „info” de pe fiecare tab: ce se poate face acolo.
export const FILES_INFO = {
  title: 'Cum funcționează fișierele încărcate',
  label: 'Informații despre fișiere',
  points: [
    'Aici ții toate fișierele pe care le poate rula playerul: clipuri MP4 și poze JPG sau PNG. Fiecare fișier stă într-un folder.',
    'Mai întâi creezi un folder (iconița de folder nou din stânga). Fără folder nu se poate încărca nimic.',
    '„Încarcă în «folder»” adaugă fișiere în folderul ales; poți alege mai multe deodată.',
    'Un fișier se mută în alt folder cu iconița de mutare de pe rândul lui.',
    'Doar un administrator creează, redenumește sau șterge foldere și redenumește sau șterge fișiere. Un folder se șterge doar dacă e gol.',
    'Dacă redenumești un fișier folosit în program, programul se actualizează singur.',
    'Ce încarci aici alegi apoi în Clipuri implicite, Petreceri și Poză fundal.',
  ],
};

export const HOURS_INFO = {
  title: 'Cum funcționează programul de lucru',
  label: 'Informații despre programul de lucru',
  points: [
    'Setezi ora de deschidere și ora de închidere. În timpul programului rulează clipurile implicite și petrecerile; la închidere playerul se oprește.',
    'Dacă ora de închidere e mai mică decât cea de deschidere (de exemplu 22:00 – 06:00), programul trece peste miezul nopții.',
    'În afara programului, butoanele Play, Pauză și Stop se folosesc doar manual și nu depind de program.',
    'Poze fundal: apar în timpul programului, când nu rulează niciun video implicit sau de petrecere, și după Stop. Poți adăuga mai multe: se schimbă între ele în ordine, în buclă, după secundele fiecăreia (gol = 10 secunde). O singură poză rămâne permanent.',
    'Modificările se aplică pe player după „Salvează și aplică”.',
  ],
};

export const DEFAULT_CLIPS_INFO = {
  title: 'Cum funcționează clipurile implicite',
  label: 'Informații despre clipurile implicite',
  points: [
    'Clipurile implicite rulează în timpul programului de lucru, când nu e o petrecere în desfășurare, în ordinea listei și în buclă.',
    'Pentru fiecare rând alegi fișierul din foldere și bifezi zilele în care rulează (L – D).',
    'Ordinea se schimbă trăgând de mânerul din stânga unui rând.',
    'La poze alegi câte minute stau pe ecran (gol = 10 secunde).',
    '„Pornește acum” rulează doar clipul respectiv, până la Stop, până începe automat o petrecere sau până la închiderea programului.',
    '„Rulează toate” pornește toate clipurile din listă, în ordine, în buclă, cu aceleași reguli de oprire (indiferent de zilele bifate).',
    'Dacă într-o zi nu e niciun clip implicit și nicio petrecere, în timpul programului apare poza fundal.',
    'Modificările se aplică pe player după „Salvează și aplică”.',
  ],
};

export const PARTIES_INFO = {
  title: 'Cum funcționează petrecerile',
  label: 'Informații despre petreceri',
  points: [
    '„Adaugă petrecere” deschide o fereastră unde alegi ziua, orele și fișierele; petrecerea se salvează apoi cu „Salvează și aplică”.',
    'Fișierele unei petreceri rulează în ordinea de mai jos, în buclă, între ora de început și ora de sfârșit, și au prioritate față de clipurile implicite.',
    'Ordinea se schimbă trăgând de mânerul din stânga unui rând.',
    'La poze alegi câte minute stau pe ecran (gol = 10 secunde).',
    '„Pornește acum” (doar după ce petrecerea e salvată) pornește petrecerea imediat, ca un clip implicit: ignoră doar ora ei de început și de sfârșit (merge și înainte de oră, și după ce s-ar fi terminat).',
    'Următoarea petrecere programată începe singură la ora ei, iar la închiderea programului playerul se oprește, indiferent cum a pornit ce rula.',
    '„Rulează acum” pornește direct fișiere alese din foldere, fără să adauge o petrecere, cu același comportament.',
    'Orele de început și de sfârșit sunt opționale (ambele sau niciuna). Fără ore, petrecerea nu pornește singură, ci doar din „Pornește acum”; astfel de petreceri apar primele în listă.',
    'Petrecerile sunt grupate pe zile: alegi ziua cu săgețile sau din calendar.',
  ],
};

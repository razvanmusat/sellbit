# Daisy Expert SX — Referință tehnică pentru agentul FiscalWire

## Modul PC

Casa de marcat intră în modul PC prin: MODE → PC → parolă 9999 → CLK

În modul PC, casa se comportă ca o **imprimantă fiscală** controlată de software prin USB.
Erorile sunt trimise programului și **nu sunt afișate pe ecranul casei de marcat**.

---

## Grupuri TVA

Daisy Expert SX suportă **5 grupuri TVA**, numerotate 1–4 (0 = non-TVA).
Pe bon sunt afișate ca litere: **A, B, C, D, E** (corespund grupurilor 1–5).

| Literă bon | Grup intern | Cotă implicită (exemplu) |
|------------|-------------|--------------------------|
| A          | 1           | 19% (în manual; în RO 2024 = 21%) |
| B          | 2           | configurabil             |
| C          | 3           | configurabil             |
| D          | 4           | configurabil             |
| E          | 5 / 0       | non-TVA                  |

> Cota TVA standard România din 2024 este **21%**, nu 19%.
> Litera grupului se programează în PROGR → QTY → A TVA[%].

---

## Tipuri de plată

Daisy are **9 tipuri de plată** programate (denumirile nu pot fi reprogramate):

| Index | Denumire Daisy           | Cheie tastatură (manual mod) |
|-------|--------------------------|------------------------------|
| 1     | Card                     | PAY                          |
| 2     | \_\_\_\_                 | ALT+ST+1                     |
| 3     | Numerar                  | TL (implicit)                |
| 4     | Tichete masa             | ALT+PAY                      |
| 5     | Bonuri/tichete valorice  | ALT+ST+4                     |
| 6     | Voucher                  | ALT+ST+5                     |
| 7     | Credit                   | ALT+ST+6                     |
| 8     | Metode moderne de plata  | ALT+ST+7                     |
| 9     | Alte metode              | ALT+ST+8                     |

> **Numerar nu poate fi dezactivat.** Este tipul implicit (TL).

### Voucher vs Bonuri/tichete valorice

- **Voucher (tip 6)** = voucher intern, oră gratuită, serviciu oferit cadou → plată fără numerar fizic
- **Bonuri/tichete valorice (tip 5)** = tichete cadou cu valoare nominală (Edenred, etc.)

Când clientul plătește parțial cu voucher:
- Produsele se înregistrează la **prețul întreg**
- Voucher-ul apare ca **linie de plată separată** pe bon
- Daisy calculează restul din celelalte metode

Exemplu bon cu plată mixtă (200 lei total):
```
Serviciu X        200.00 lei  A
────────────────────────────
TOTAL             200.00 lei
NUMERAR           100.00 lei
CARD               50.00 lei
VOUCHER            50.00 lei
```

---

## Structura JSON trimisă agentului FiscalWire

```json
{
  "payment_id": "sb-{receiptId}-{timestamp_ms}",
  "items": [
    {
      "name": "Nume produs (max ~36 chars)",
      "price": 10.50,
      "qty": 2.0,
      "vat_group": "A"
    }
  ],
  "payments": [
    { "type": "cash",    "amount": 100.00 },
    { "type": "card",    "amount": 50.00  },
    { "type": "voucher", "amount": 50.00  }
  ]
}
```

**Reguli:**
- `vat_group` = litera A/B/C/D/E (litera cotei TVA configurată în Daisy)
- `price` = preț unitar (nu total linie)
- `qty` poate fi zecimal (ex: 1.5 ore)
- Suma `payments` trebuie să fie egală cu suma `items` (price × qty)
- `payment_id` trebuie să fie unic per bon

---

## Endpointuri FiscalWire (agentul Python local)

| Metodă | Path         | Descriere                          |
|--------|--------------|------------------------------------|
| GET    | `/status`    | Returnează `{"active": true/false}` |
| POST   | `/print-bon` | Primește JSON bon, printează, returnează 200 OK sau eroare |

Timeout recomandat:
- `/status` → 2 secunde
- `/print-bon` → 35 secunde (Daisy poate fi lentă la bon complex)

---

## Coduri de eroare Daisy (relevante pentru PC mode)

Erorile marcate cu `*` apar **doar în modul PC** și sunt trimise programului, nu afișate pe ecran.

### Erori operaționale (bon deschis)

| Cod | Text Daisy        | Cauză                                              | Acțiune |
|-----|-------------------|----------------------------------------------------|---------|
| 3   | MAXIM VANZ BON    | Prea multe linii de vânzare pe bon                 | Închide bonul |
| 4   | NR.MAX.PLATI      | Prea multe plăți pe bon                            | Închide bonul |
| 5   | VALOARE ZERO      | Tranzacție cu sumă zero                            | Corectează |
| 6   | INCEPE PLATA      | Vânzare după ce plata a fost inițiată              | Închide bonul |
| 7   | OPER.INTERZISA    | Operație interzisă                                 | Verifică config |
| 19  | BON DESCHIS       | Există un bon deschis deja                         | Închide bonul anterior |
| 25  | OPERATIE GRESITA  | Închidere bon fără nicio vânzare                   | Adaugă produs |
| 26  | NU E STOC         | Articol PLU fără stoc                              | Verifică stoc |

### Erori raport zilnic

| Cod | Text Daisy        | Cauză                                              | Acțiune casier |
|-----|-------------------|----------------------------------------------------|----------------|
| 81  | DEPAS.RAP.ZILN.   | Raportul Z zilnic nu a fost făcut                  | Solicită raport Z |
| 82  | DEPASIT 24h       | 24h fără raport Z                                  | Solicită raport Z urgent |
| 83  | DEPAS.RAP.OPER.   | Raportul pe operatori plin                         | Raport operatori cu reset |
| 84  | DEPAS.RAP.ART.    | Raportul pe articole plin                          | Raport articole cu reset |
| 91  | NECESAR RAP.ZILN  | Raportul zilnic nu a fost efectuat                 | Solicită raport Z |
| 92  | NECESAR RAP.OPER  | Raportul pe operatori nu a fost resetat            | Raport operatori |
| 93  | NECESAR RAP.ART.  | Raportul pe articole nu a fost resetat             | Raport articole |

### Erori hardware / memorie fiscală (necesită service)

| Cod | Text Daisy             | Cauză                                         |
|-----|------------------------|-----------------------------------------------|
| 30  | MF PLINA               | Memoria fiscală plină                         |
| 61  | EROARE CARD            | SD Card defect                                |
| 70  | FM NU EXISTA           | Modulul de memorie fiscală lipsă              |
| 71  | INLOCUIRE FM           | Date incorecte în memoria fiscală             |
| 72  | EROARE INREG.FM        | Eroare scriere în memoria fiscală             |
| 98  | LIPSĂ CERTIFICAT DIGITAL | Certificat digital lipsă                    |
| 123 | SD CARD DEFECT         | SD card intern JE defect                      |
| 124 | SD CARD SCHIMBAT       | SD card intern JE schimbat                    |
| 126 | SD CARD INTERN PLIN    | SD card intern JE plin                        |

---

## Lipsă hârtie

**Nu există cod de eroare numeric pentru lipsă hârtie.**
Hârtia puțină este semnalizată **fizic** prin linii roșii pe bon (semnal termic pe rolă).
Daisy nu trimite un cod digital la PC pentru această situație.

---

## Mapare erori Daisy → chei errorHandler.js (sellbit)

```
"ERROR.FISCAL.PRINT_FAILED"        → eroare generică non-200 de la agent
"ERROR.FISCAL.AGENT_UNREACHABLE"   → agentul Python nu răspunde
"ERROR.FISCAL.RAPORT_Z_NECESAR"    → Daisy cod 81 / 91
"ERROR.FISCAL.DEPASIT_24H"         → Daisy cod 82
"ERROR.FISCAL.MF_PLINA"            → Daisy cod 30
"ERROR.FISCAL.CERTIFICAT_LIPSA"    → Daisy cod 98
```

---

## Note importante pentru implementarea agentului Python

1. **Ordinea comenzilor în bon**: articole → subtotal → plăți → închidere bon
2. **Suma plăților = suma articolelor** — Daisy refuză dacă nu se potrivesc
3. **Voucher** = tip plată separat, nu reducere. Produsul rămâne la preț întreg.
4. **TVA pe linie** — fiecare articol trebuie să aibă `vat_group` valid programat în Daisy
5. **Numele articolului** — max ~36 caractere (limita bonului lat de 57mm)
6. **Daisy trebuie să fie în modul PC** înainte ca agentul să trimită comenzi
7. **Un singur bon deschis la un moment dat** — eroarea 19 (BON DESCHIS) dacă se încearcă deschidere nouă
8. **Raport Z zilnic obligatoriu** — fără el, după 24h Daisy blochează printarea (erori 81/82/91)

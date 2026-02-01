/**
 * Dictionar centralizat de erori.
 * Mapează codurile de eroare din Java la mesaje în limba română.
 */
const ERROR_MESSAGES = {
    // --- AUTH & USER ---
    "ERROR.USER.NOT_FOUND": "Utilizatorul nu a fost găsit în sistem.",
    "ERROR.AUTH.BAD_CREDENTIALS": "Email sau parolă incorectă.",
    "ERROR.AUTH.ACCOUNT_LOCKED": "Contul este blocat. Contactează administratorul.",

    // --- CASH & DRAWER ---
    "ERROR.CASH_DRAWER.INSUFFICIENT_FUNDS": "Fonduri insuficiente în sertar! Nu poți scoate mai mulți bani decât există.",
    "ERROR.MOVEMENT_TYPE.NOT_FOUND": "Tipul de mișcare selectat este invalid.",
    "ERROR.WAREHOUSE.NOT_FOUND": "Gestiunea selectată nu a fost găsită.",

    // --- RECEIPTS (BONURI) ---
    "ERROR.RECEIPT.NOT_FOUND": "Bonul fiscal nu a fost găsit.",
    "ERROR.RECEIPT.NOT_OPEN": "Bonul este închis și nu mai poate fi modificat.",
    "ERROR.RECEIPT.ALREADY_CLOSED": "Acest bon este deja închis.",
    "ERROR.RECEIPT.INCOMPLETE_PAYMENT": "Bonul nu este achitat integral.",
    "ERROR.RECEIPT.HAS_PAYMENTS_PLEASE_REFUND_FIRST": "Nu poți anula bonul! Sterge plățile efectuate înainte.",
    
    // --- STOCKS & PRODUCTS ---
    "ERROR.PRODUCT.NOT_FOUND": "Produsul căutat nu există în catalog.",
    "ERROR.ITEM.NOT_FOUND": "Produsul nu a fost găsit pe acest bon.",
    "ERROR.STOCK.INSUFFICIENT_QUANTITY": "Stoc insuficient",
    "ERROR.INSUFFICIENT_STOCK_QUANTITY": "Stoc insuficient",
    "ERROR.STOCK": "Stoc insuficient.",
    "ERROR.PRODUCT.REQUIRED": "Produsul este obligatoriu.",
    "ERROR.WAREHOUSE.REQUIRED": "Gestiunea este obligatorie.",

    // --- STOCKS & ADJUSTMENTS (STRICT LOGIC) ---
    "ERROR.ADJUSTMENT.INVALID_QUANTITY": "Cantitatea introdusă pentru ajustare este invalidă.",
    "ERROR.ADJUSTMENT.NOT_TRACKED_PRODUCT": "Acest produs nu este inventariabil (Catering/Serviciu).",
    "ERROR.ADJUSTMENT.INSUFFICIENT_STOCK": "Stoc insuficient pentru a efectua această scădere.",
    "ERROR.ADJUSTMENT_REASON.NOT_FOUND": "Motivul ajustării nu a fost găsit.",
    "ERROR.REASON.REQUIRED": "Selectarea unui motiv pentru ajustare este obligatorie.",

    // --- PAYMENTS ---
    "ERROR.PAYMENT.EXCEEDS_TOTAL": "Suma introdusă depășește restul de plată.",
    "ERROR.PAYMENT_METHOD.NOT_FOUND": "Metodă de plată invalidă.",
    "ERROR.PAYMENT.NOT_FOUND": "Plata nu a fost găsită.",
    
    // --- VOUCHERS ---
    "ERROR.CODE_REQUIRED": "Vă rugăm introduceți codul voucherului.",
    "ERROR.CUSTOMER_VOUCHER.NOT_FOUND": "Voucherul nu a fost găsit în sistem.",
    "ERROR.VOUCHER.NOT_FOUND": "Voucherul nu a fost găsit.",
    "ERROR.CUSTOMER_VOUCHER.ALREADY_USED": "Acest voucher a fost deja utilizat.",
    "ERROR.CUSTOMER_VOUCHER.EXPIRED": "Termenul de valabilitate al voucherului a expirat.",
    "ERROR.CUSTOMER_VOUCHER.INVALID_DAY": "Voucherul nu este valabil în această zi.",
    "ERROR.VOUCHER.NO_APPLICABLE_ITEMS": "Bonul nu conține produsele necesare pentru acest voucher.",
    "ERROR.PAYMENT_METHOD.VOUCHER_NOT_CONFIGURED": "Eroare configurare: Metoda de plată Voucher lipsește.",

    // --- RESERVATIONS ---
    "ERROR.RESERVATION.START_REQUIRED": "Selectează ora de început.",
    "ERROR.RESERVATION.END_REQUIRED": "Selectează ora de sfârșit.",
    "ERROR.RESERVATION.PARENT_NAME_REQUIRED": "Numele părintelui este obligatoriu.",
    "ERROR.RESERVATION.PHONE_REQUIRED": "Numărul de telefon este obligatoriu.",
    "ERROR.RESERVATION.NOT_FOUND": "Rezervarea nu a fost găsită.",
    "ERROR.RESERVATION.DATES_REQUIRED": "Intervalul orar este incomplet.",
    "ERROR.RESERVATION.START_MUST_BE_BEFORE_END": "Ora de început trebuie să fie înaintea celei de final.",
    "ERROR.RESERVATION.DATE_IN_PAST": "Nu poți face rezervări în trecut.",
    "ERROR.RESERVATION.PHONE_INVALID_FORMAT": "Număr de telefon invalid.",
    "ERROR.RESERVATION.TIME_SLOT_OCCUPIED": "Interval ocupat! Alege altă oră.",
    "ERROR.RESERVATION.CANNOT_DELETE_PAST": "Nu poți șterge rezervări din trecut.",

    // --- CATERING (NOU) ---
    "ERROR.CATERING_ORDER.MENU_REQUIRED": "Produsul este obligatoriu.",
    "ERROR.CATERING_ORDER.QUANTITY_REQUIRED": "Cantitatea este obligatorie.",
    "ERROR.CATERING_ORDER.MIN_QUANTITY_1": "Cantitatea trebuie să fie cel puțin 1.",
    "ERROR.CATERING_ORDER.DATE_REQUIRED": "Data comenzii este obligatorie.",
    "ERROR.CATERING_ORDER.NO_ORDERS_SELECTED": "Nu ai selectat nicio comandă pentru plată.",
    "ERROR.CATERING_ORDER.PRODUCT_NOT_FOUND": "Produsul selectat nu a fost găsit în sistem.",
    "ERROR.CATERING_ORDER.CREATE_FORBIDDEN_PAST_DATE": "Nu poți crea comenzi în trecut.",
    "ERROR.CATERING_ORDER.NOT_FOUND": "Comanda de catering nu a fost găsită.",
    "ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE": "Nu poți modifica o comandă din trecut.",
    "ERROR.CATERING_ORDER.DELETE_FORBIDDEN_PAST_DATE": "Nu poți șterge o comandă din trecut.",

    // --- GENERICE ---
    "INTERNAL_SERVER_ERROR": "A apărut o eroare internă la server.",
    "DEFAULT": "A apărut o eroare neașteptată. Încearcă din nou."
};

//Extrage mesajul prietenos din eroarea de backend.
export const getFriendlyErrorMessage = (error) => {    
    let params = [];
    let serverCode = "";

    // CAZ 1: Eroare directă din Redux (deja procesată în Slice)    
    if (error && error.message && Array.isArray(error.params)) {
        serverCode = error.message;
        params = error.params;
    }
    // CAZ 2: Eroare Axios "brută" (cu response.data)
    else if (error?.response?.data) {
        const data = error.response.data;
        serverCode = data.message || data;
        if (Array.isArray(data.params)) {
            params = data.params;
        }
    } 
    // CAZ 3: Fallback (Eroare JS standard sau string)
    else if (error?.message) {
        serverCode = error.message;
    } else if (typeof error === 'string') {
        serverCode = error;
    }

    const codeString = String(serverCode);

    // Traducere cod
    let friendlyMessage = codeString; 
    
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
        if (codeString.includes(key)) {
            friendlyMessage = message;
            break;
        }
    }

    if (codeString.includes("Network Error")) {
        friendlyMessage = "Eroare de conexiune.";
    }

    // Adăugare parametri (Nume produse)
    if (params && params.length > 0) {
        friendlyMessage += `: ${params.join(", ")}`;
    }

    return friendlyMessage;
};
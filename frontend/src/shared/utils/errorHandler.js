/**
 * Dictionar centralizat de erori.
 * Mapează codurile de eroare din Java la mesaje în limba română.
 */
const ERROR_MESSAGES = {
  // --- AUTH & USER ---
  "ERROR.USER.NOT_FOUND": "Utilizatorul nu a fost găsit în sistem.",
  "ERROR.AUTH.WRONG_OLD_PASSWORD": "Parola veche este incorectă.",
  "ERROR.USER.INVALID_PASSWORD_STRENGTH":
    "Parola nouă nu respectă regulile de securitate.",
  "ERROR.USER.OLD_PASSWORD_EMPTY": "Parola veche este obligatorie.",
  "ERROR.USER.NEW_PASSWORD_EMPTY": "Parola nouă este obligatorie.",
  "ERROR.USER.DUPLICATE": "Username-ul există deja. Alege un username unic.",
  "ERROR.USER.INVALID_USERNAME_FORMAT": "Format invalid pentru username.",
  "ERROR.USER.CANNOT_DEACTIVATE_LAST_ADMIN":
    "Nu poți dezactiva ultimul administrator activ.",
  "ERROR.USER.ALREADY_ACTIVE": "Utilizatorul este deja activ.",
  "ERROR.ROLE.NOT_FOUND": "Rolul selectat nu există.",
  "ERROR.AUTH.BAD_CREDENTIALS": "Email sau parolă incorectă.",
  "ERROR.AUTH.ACCOUNT_LOCKED":
    "Contul este blocat. Contactează administratorul.",

  // --- CASH & DRAWER ---
  "ERROR.CASH_DRAWER.INSUFFICIENT_FUNDS":
    "Fonduri insuficiente în sertar! Nu poți scoate mai mulți bani decât există.",
  "ERROR.MOVEMENT_TYPE.NOT_FOUND": "Tipul de mișcare selectat este invalid.",

  // --- WAREHOUSES (GESTIUNI) ---
  "ERROR.WAREHOUSE.NOT_FOUND": "Gestiunea selectată nu a fost găsită.",
  "ERROR.WAREHOUSE.CODE_EXISTS":
    "Codul gestiunii există deja! Alege un cod unic.",
  "ERROR.WAREHOUSE.HAS_STOCK":
    "Nu poți dezactiva această gestiune deoarece încă are stoc existent.",
  "ERROR.WAREHOUSE.CODE_EMPTY": "Codul gestiunii este obligatoriu.",
  "ERROR.WAREHOUSE.NAME_EMPTY": "Numele gestiunii este obligatoriu.",
  "ERROR.WAREHOUSE.ID_REQUIRED": "ID-ul gestiunii lipsește (Eroare internă).",

  // --- RECEIPTS (BONURI) ---
  "ERROR.RECEIPT.NOT_FOUND": "Bonul fiscal nu a fost găsit.",
  "ERROR.RECEIPT.NOT_OPEN": "Bonul este închis și nu mai poate fi modificat.",
  "ERROR.RECEIPT.ALREADY_CLOSED": "Acest bon este deja închis.",
  "ERROR.RECEIPT.INCOMPLETE_PAYMENT": "Bonul nu este achitat integral.",
  "ERROR.RECEIPT.HAS_PAYMENTS_PLEASE_REFUND_FIRST":
    "Nu poți anula bonul! Sterge plățile efectuate înainte.",
  "ERROR.RECEIPT.ITEM_LOCKED_BY_PAYMENT":
    "Nu poți modifica această linie cât timp există plăți care o acoperă pe gestiunea ei. Șterge întâi plățile de pe acea gestiune.",
  "ERROR.RECEIPT.WAREHOUSE_PAYMENT_MISMATCH":
    "Plățile nu se potrivesc cu produsele pe gestiuni. Reajustează plățile per gestiune înainte de închidere.",

  // --- STOCKS & PRODUCTS ---  
  "ERROR.ITEM.NOT_FOUND": "Produsul nu a fost găsit pe acest bon.",
  "ERROR.STOCK.INSUFFICIENT_QUANTITY": "Stoc insuficient",
  "ERROR.INSUFFICIENT_STOCK_QUANTITY": "Stoc insuficient",
  "ERROR.STOCK": "Stoc insuficient.",
  "ERROR.PRODUCT.REQUIRED": "Produsul este obligatoriu.",
  "ERROR.WAREHOUSE.REQUIRED": "Gestiunea este obligatorie.",
  "ERROR.USER.ADMIN_NOT_FOUND":
    "Eroare internă: Utilizatorul Administrator nu a fost găsit.",

  // --- REFUND / STORNARE ---
  "ERROR.RECEIPT.CANNOT_REFUND_NOT_CLOSED":
    "Bonul trebuie să fie închis pentru a putea face retur.",
  "ERROR.REFUND.QUANTITY_EXCEEDED":
    "Cantitatea de retur depășește cantitatea originală.",
  "ERROR.STOCK.BATCHES_INSUFFICIENT":
    "Stoc FIFO insuficient pentru a procesa această operațiune.",

  // --- EDITARE BON ---
  "ERROR.RECEIPT.CANNOT_EDIT_NOT_CLOSED":
    "Bonul poate fi editat doar dacă este închis.",
  "ERROR.RECEIPT.CANNOT_EDIT_CORRECTION":
    "Acest bon este o corecție internă (storno de editare) și nu poate fi editat.",
  "ERROR.RECEIPT.VOUCHER_AUTO_CARRIED":
    "Voucherul se transferă automat pe bonul corectat — nu-l poți adăuga manual.",
  "ERROR.ITEM.WAREHOUSE_NOT_PROVIDED":
    "Eroare internă: gestiunea lipsește pentru unul dintre produse.",

  // --- STOCKS & ADJUSTMENTS (STRICT LOGIC) ---
  "ERROR.ADJUSTMENT.INVALID_QUANTITY":
    "Cantitatea introdusă pentru ajustare este invalidă.",
  "ERROR.ADJUSTMENT.NOT_TRACKED_PRODUCT":
    "Acest produs nu este inventariabil (Catering/Serviciu).",
  "ERROR.ADJUSTMENT.INSUFFICIENT_STOCK":
    "Stoc insuficient pentru a efectua această scădere.",
  "ERROR.ADJUSTMENT_REASON.NOT_FOUND": "Motivul ajustării nu a fost găsit.",
  "ERROR.REASON.REQUIRED":
    "Selectarea unui motiv pentru ajustare este obligatorie.",

  // --- PAYMENTS ---
  "ERROR.PAYMENT.EXCEEDS_TOTAL": "Suma introdusă depășește restul de plată.",
  "ERROR.PAYMENT_METHOD.NOT_FOUND": "Metodă de plată invalidă.",
  "ERROR.PAYMENT.NOT_FOUND": "Plata nu a fost găsită.",

  // --- VOUCHERS ---
  "ERROR.CODE_REQUIRED": "Vă rugăm introduceți codul voucherului.",
  "ERROR.CUSTOMER_VOUCHER.NOT_FOUND": "Voucherul nu a fost găsit în sistem.",
  "ERROR.VOUCHER.NOT_FOUND": "Voucherul nu a fost găsit.",
  "ERROR.CUSTOMER_VOUCHER.ALREADY_USED": "Voucherul a fost deja utilizat.",
  "ERROR.VOUCHER.ALREADY_ACTIVE": "Voucherul este deja activ.",
  "ERROR.CUSTOMER_VOUCHER.EXPIRED":
    "Termenul de valabilitate al voucherului a expirat.",
  "ERROR.CUSTOMER_VOUCHER.INVALID_DAY":
    "Voucherul nu este valabil în această zi.",
  "ERROR.VOUCHER.NO_APPLICABLE_ITEMS":
    "Bonul nu conține produsele necesare pentru acest voucher.",
  "ERROR.VOUCHER.DELETE_PAYMENTS_FIRST":
    "Pentru a folosi voucherul complet, ștergeți întâi plățile existente.",
  "ERROR.VOUCHER.REUSE_SAME_RECEIPT_NOT_ALLOWED":
    "Acest voucher a fost deja folosit pe acest bon și nu mai poate fi reaplicat.",
  "ERROR.PAYMENT_METHOD.VOUCHER_NOT_CONFIGURED":
    "Eroare configurare: Metoda de plată Voucher lipsește.",
  "ERROR.VOUCHER_CAMPAIGN.NAME_REQUIRED":
    "Denumirea campaniei este obligatorie.",
  "ERROR.VOUCHER_CAMPAIGN.NAME_TOO_LONG":
    "Denumirea campaniei este prea lunga.",
  "ERROR.VOUCHER_CAMPAIGN.START_DATE_REQUIRED":
    "Data de inceput este obligatorie.",
  "ERROR.VOUCHER_CAMPAIGN.END_DATE_REQUIRED": "Data de final este obligatorie.",
  "ERROR.VOUCHER_CAMPAIGN.INVALID_DATE_RANGE":
    "Intervalul de date este invalid.",
  "ERROR.VOUCHER_CAMPAIGN.DISCOUNT_TYPE_REQUIRED":
    "Tipul discountului este obligatoriu.",
  "ERROR.VOUCHER_CAMPAIGN.TYPE_TOO_LONG": "Tipul discountului este prea lung.",
  "ERROR.VOUCHER_CAMPAIGN.DISCOUNT_VALUE_REQUIRED":
    "Valoarea discountului este obligatorie.",
  "ERROR.VOUCHER_CAMPAIGN.VALUE_MUST_BE_POSITIVE":
    "Valoarea discountului trebuie sa fie pozitiva.",
  "ERROR.VOUCHER_CAMPAIGN.INVALID_FORMAT":
    "Format numeric invalid pentru valoarea discountului.",
  "ERROR.VOUCHER_CAMPAIGN.NEGATIVE_DISCOUNT":
    "Valoarea discountului nu poate fi negativa.",
  "ERROR.VOUCHER_CAMPAIGN.PERCENT_OVER_100":
    "Discountul procentual nu poate depasi 100%.",
  "ERROR.VOUCHER_CAMPAIGN.MIN_AMOUNT_POSITIVE":
    "Suma minima trebuie sa fie pozitiva.",
  "ERROR.VOUCHER_CAMPAIGN.MIN_AMOUNT_REQUIRED": "Suma minima este obligatorie.",
  "ERROR.VOUCHER_CAMPAIGN.HOURS_POSITIVE":
    "Orele minime trebuie sa fie pozitive.",
  "ERROR.VOUCHER_CAMPAIGN.REQUIRED_PRODUCT_NOT_FOUND":
    "Produsul necesar nu a fost gasit.",
  "ERROR.VOUCHER_CAMPAIGN.APPLICABLE_PRODUCT_NOT_FOUND":
    "Produsul aplicabil nu a fost gasit.",
  "ERROR.VOUCHER_CAMPAIGN.DAYS_MIN_1":
    "Valabilitatea in zile trebuie sa fie de cel putin 1 zi.",
  "ERROR.VOUCHER_CAMPAIGN.DAYS_REQUIRED":
    "Valabilitatea in zile este obligatorie.",
  "ERROR.VOUCHER_CAMPAIGN.DAYS_STRING_TOO_LONG":
    "Lista zilelor aplicabile este prea lunga.",
  "ERROR.VOUCHER_CAMPAIGN.INVALID_DAYS_FORMAT":
    "Format invalid pentru zilele aplicabile.",
  "ERROR.VOUCHER_CAMPAIGN.PREFIX_TOO_LONG":
    "Prefixul campaniei este prea lung.",
  "ERROR.VOUCHER_CAMPAIGN.PREFIX_INVALID_CHARS":
    "Prefixul contine caractere invalide.",
  "ERROR.VOUCHER_CAMPAIGN.PREFIX_ALREADY_ACTIVE":
    "Exista deja o campanie activa cu acest prefix.",
  "ERROR.VOUCHER_CAMPAIGN.CODE_TOO_SHORT": "Codul voucherului este prea scurt.",
  "ERROR.VOUCHER_CAMPAIGN.CODE_TOO_LONG": "Codul voucherului este prea lung.",
  "ERROR.VOUCHER_CAMPAIGN.NOT_FOUND": "Campania de vouchere nu a fost gasita.",

  // --- STORE / COMPANY ---
  "ERROR.STORE.NOT_CONFIGURED": "Datele companiei nu sunt configurate încă.",
  "ERROR.STORE.NAME_REQUIRED": "Denumirea companiei este obligatorie.",
  "ERROR.STORE.ADDRESS_REQUIRED": "Adresa companiei este obligatorie.",
  "ERROR.STORE.PHONE_REQUIRED": "Telefonul companiei este obligatoriu.",
  "ERROR.STORE.EMAIL_REQUIRED": "Emailul companiei este obligatoriu.",
  "ERROR.STORE.EMAIL_INVALID": "Emailul companiei are format invalid.",
  "ERROR.STORE.VAT_REQUIRED": "CUI/CIF este obligatoriu.",
  "ERROR.STORE.REG_REQUIRED":
    "Numărul de înregistrare la Registrul Comerțului este obligatoriu.",

  // --- RESERVATIONS ---
  "ERROR.RESERVATION.START_REQUIRED": "Selectează ora de început.",
  "ERROR.RESERVATION.END_REQUIRED": "Selectează ora de sfârșit.",
  "ERROR.RESERVATION.PARENT_NAME_REQUIRED":
    "Numele părintelui este obligatoriu.",
  "ERROR.RESERVATION.PHONE_REQUIRED": "Numărul de telefon este obligatoriu.",
  "ERROR.RESERVATION.NOT_FOUND": "Rezervarea nu a fost găsită.",
  "ERROR.RESERVATION.DATES_REQUIRED": "Intervalul orar este incomplet.",
  "ERROR.RESERVATION.START_MUST_BE_BEFORE_END":
    "Ora de început trebuie să fie înaintea celei de final.",
  "ERROR.RESERVATION.DATE_IN_PAST": "Nu poți face rezervări în trecut.",
  "ERROR.RESERVATION.PHONE_INVALID_FORMAT": "Număr de telefon invalid.",
  "ERROR.RESERVATION.TIME_SLOT_OCCUPIED": "Interval ocupat! Alege altă oră.",
  "ERROR.RESERVATION.CANNOT_DELETE_PAST":
    "Nu poți șterge rezervări din trecut.",

  // --- CATERING (NOU) ---
  "ERROR.CATERING_ORDER.MENU_REQUIRED": "Produsul este obligatoriu.",
  "ERROR.CATERING_ORDER.QUANTITY_REQUIRED": "Cantitatea este obligatorie.",
  "ERROR.CATERING_ORDER.MIN_QUANTITY_1":
    "Cantitatea trebuie să fie cel puțin 1.",
  "ERROR.CATERING_ORDER.DATE_REQUIRED": "Data comenzii este obligatorie.",
  "ERROR.CATERING_ORDER.NO_ORDERS_SELECTED":
    "Nu ai selectat nicio comandă pentru plată.",
  "ERROR.CATERING_ORDER.PRODUCT_NOT_FOUND":
    "Produsul selectat nu a fost găsit în sistem.",
  "ERROR.CATERING_ORDER.CREATE_FORBIDDEN_PAST_DATE":
    "Nu poți crea comenzi în trecut.",
  "ERROR.CATERING_ORDER.NOT_FOUND": "Comanda de catering nu a fost găsită.",
  "ERROR.CATERING_ORDER.EDIT_FORBIDDEN_PAST_DATE":
    "Nu poți modifica o comandă din trecut.",
  "ERROR.CATERING_ORDER.DELETE_FORBIDDEN_PAST_DATE":
    "Nu poți șterge o comandă din trecut.",

  // --- UPLOAD FILES ---
  "ERROR.UPLOAD.DIR_NOT_AVAILABLE":
    "Folderul de upload nu este disponibil pe server.",
  "ERROR.UPLOAD.EMPTY_FILE": "Selectează un fișier înainte de încărcare.",
  "ERROR.UPLOAD.INVALID_NAME": "Numele fișierului este invalid.",
  "ERROR.UPLOAD.INVALID_FOLDER": "Folderul selectat este invalid.",
  "ERROR.UPLOAD.INVALID_TYPE": "Tip de fișier nepermis.",
  "ERROR.UPLOAD.SAVE_FAILED": "Fișierul nu a putut fi salvat.",
  "ERROR.UPLOAD.LIST_FAILED": "Lista fișierelor nu a putut fi încărcată.",
  "ERROR.UPLOAD.NOT_FOUND": "Fișierul nu a fost găsit.",
  "ERROR.UPLOAD.READ_FAILED": "Fișierul nu a putut fi deschis.",
  "ERROR.UPLOAD.DELETE_FAILED": "Fișierul nu a putut fi șters.",
  "ERROR.UPLOAD.FOLDER_NOT_EMPTY":
    "Folderul nu poate fi șters deoarece conține fișiere.",
  "ERROR.UPLOAD.FOLDER_NOT_FOUND": "Folderul nu a fost găsit.",
  "ERROR.UPLOAD.FOLDER_DELETE_FAILED": "Folderul nu a putut fi șters.",

  // --- CATEGORIES (ADMIN) ---
  "ERROR.CATEGORY.DUPLICATE_CODE":
    "Codul categoriei există deja. Alege alt cod.",
  "ERROR.CATEGORY.PARENT_NOT_FOUND": "Categoria părinte selectată nu există.",
  "ERROR.CATEGORY.NOT_FOUND": "Categoria nu a fost găsită.",
  "ERROR.CATEGORY.PARENT_IMMUTABLE":
    "Nu poți muta o categorie existentă sub un alt părinte.",
  "ERROR.CATEGORY.NOT_LEAF":
    "Nu poți adăuga produse aici! Această categorie are subcategorii.",
  "ERROR.CATEGORY.NOT_FOUND_ID": "Categoria cu acest ID nu a fost găsită.",
  "ERROR.CATEGORY.PARENT_INACTIVE":
    "Categoria părinte este inactivă. Activeaz-o pe aceea mai întâi.",

  // --- PRODUCTS (ADMIN) ---
  "ERROR.PRODUCT.DUPLICATE_BARCODE":
    "Acest cod de bare este deja folosit la alt produs.",
  "ERROR.PRODUCT.INACTIVE": "Produsul este inactiv și nu poate fi procesat.",
  "ERROR.PRODUCT.NOT_FOUND": "Produsul nu a fost găsit.",
  "ERROR.UNIT.NOT_FOUND": "Unitatea de măsură selectată este invalidă.",
  "ERROR.PRODUCT_TYPE.NOT_FOUND": "Tipul de produs selectat este invalid.",
  "ERROR.VAT.NOT_FOUND": "Cota TVA selectată este invalidă.",
  "ERROR.PRODUCT.PARENT_CATEGORY_INACTIVE":
    "Nu poți activa produsul deoarece categoria din care face parte este inactivă.",

  // --- PRODUCTS VALIDATION ---
  "ERROR.PRODUCT.NAME_REQUIRED": "Numele produsului este obligatoriu.",
  "ERROR.CATEGORY.REQUIRED": "Categoria este obligatorie.",
  "ERROR.PRODUCT_TYPE.REQUIRED": "Tipul produsului este obligatoriu.",
  "ERROR.UNIT.REQUIRED": "Unitatea de măsură este obligatorie.",
  "ERROR.VAT.REQUIRED": "Cota TVA este obligatorie.",
  "ERROR.PRICE.REQUIRED": "Prețul de vânzare este obligatoriu.",
  "ERROR.PRICE.INVALID": "Prețul trebuie să fie pozitiv.",
  "ERROR.CATERING.PRICE_REQUIRED":
    "Pentru produsele Catering, prețul de achiziție (costul) este obligatoriu și trebuie să fie mai mare ca 0.",

  // --- COMPOSITE / RETETAR ---
  "ERROR.PARENT_PRODUCT.REQUIRED": "Produsul părinte (meniul) lipsește.",
  "ERROR.COMPONENTS.EMPTY":
    "Rețeta trebuie să conțină cel puțin un ingredient.",
  "ERROR.CHILD_PRODUCT.REQUIRED": "Ingredientul este obligatoriu.",
  "ERROR.QUANTITY.TOO_LOW":
    "Cantitatea ingredientului trebuie să fie pozitivă.",
  "ERROR.CHILD_PRODUCT.NOT_FOUND":
    "Unul dintre ingrediente nu mai există în sistem.",
  "ERROR.COMPOSITE.SELF_REFERENCE":
    "Eroare logică: Un produs nu poate fi propriul său ingredient.",
  "ERROR.COMPOSITE.OPEN_RECEIPTS_EXIST":
    "Există bonuri deschise! Nu poți modifica rețeta în timpul programului.",  
  "ERROR.QUANTITY.REQUIRED": "Cantitatea este obligatorie.",

  // --- GENERICE ---
  INTERNAL_SERVER_ERROR: "A apărut o eroare internă la server.",
  DEFAULT: "A apărut o eroare neașteptată. Încearcă din nou.",
  "ERROR.RECEIPT.CANNOT_REFUND_NOT_CLOSED":
    "Bonul trebuie să fie închis pentru a putea face retur.",
  "ERROR.REFUND.QUANTITY_EXCEEDED":
    "Cantitatea de retur depășește cantitatea originală.",
  "ERROR.CATERING.PURCHASE_PRICE_NULL":
    "Prețul de achiziție pentru produsul Catering lipsește.",
  "ERROR.ADVANCE.INVALID_AMOUNT": "Suma avansului este invalidă.",
  "ERROR.PRODUCT.ADVANCE_NOT_CONFIGURED":
    "Produsul de tip Avans nu este configurat în sistem.",
  "ERROR.CANCEL_REASON.NOT_FOUND": "Motivul de anulare nu a fost găsit.",
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
  } else if (typeof error === "string") {
    serverCode = error;
  }

  const codeString = String(serverCode);

  // Traducere cod
  let friendlyMessage = codeString;

  const productNameMatch = codeString.match(/\|product=([^|]+)/);

  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (codeString === key || codeString.startsWith(key + '|')) {
      if (productNameMatch && (key === "ERROR.STOCK.INSUFFICIENT_QUANTITY" || key === "ERROR.STOCK.BATCHES_INSUFFICIENT")) {
        friendlyMessage = `Stoc insuficient pentru produsul: ${productNameMatch[1]}`;
      } else {
        friendlyMessage = message;
      }
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

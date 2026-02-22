-------------------------------------------------------------------------------
-- 1. MOTIVE AJUSTARE STOC (Adjustment Reasons)
-- Folosite in stock_adjustments pentru a justifica plusurile/minusurile la inventar.
-------------------------------------------------------------------------------
INSERT INTO adjustment_reasons (code, label, is_active, created_at, updated_at) VALUES
('DAMAGED', 'Produs Deteriorat', true, NOW(), NOW()),
('EXPIRED', 'Expirat', true, NOW(), NOW()),
('THEFT', 'Furt', true, NOW(), NOW()),
('INVENTORY_COUNT', 'Inventar Periodic', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 2. MOTIVE ANULARE BON (Cancel Reasons)
-- Folosite in receipts cand un bon deschis este anulat (nu finalizat/stornat).
-------------------------------------------------------------------------------
INSERT INTO cancel_reasons (code, label, is_active, created_at, updated_at) VALUES
('CUSTOMER_REJECTION', 'Refuz client', true, NOW(), NOW()),
('ERROR_ENTRY', 'Eroare operare', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 3. TIPURI MISCARI NUMERAR (Cash Movement Types)
-- Gestioneaza fluxul de bani in Cash Drawer si evidenta stornarilor.
-- NOTA: Include REFUND_CARD pentru a avea toate corectiile valorice intr-un singur loc.
-------------------------------------------------------------------------------
INSERT INTO cash_movement_types (code, label, is_active, created_at, updated_at) VALUES
('SALE', 'Incasare numerar (Vanzare)', true, NOW(), NOW()),
('BANK_DEPOSIT', 'Depunere banca', true, NOW(), NOW()),
('REFUND', 'Retur/anulare numerar', true, NOW(), NOW()),
('REFUND_CARD', 'Retur/anulare card', true, NOW(), NOW()),
('PAYMENT_SUPPLIER', 'Plata furnizor', true, NOW(), NOW()),
('CASH_IN', 'Intrare Numerar (Alimentare)', true, NOW(), NOW()),
('CASH_OUT', 'Iesire Numerar (Cheltuieli)', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 4. METODE DE PLATA (Payment Methods)
-- Codurile CASH, CARD si VOUCHER sunt hardcodate in ReceiptPaymentService.
-------------------------------------------------------------------------------
INSERT INTO payment_methods (code, label, is_active, created_at, updated_at) VALUES
('CASH', 'Numerar', true, NOW(), NOW()),
('CARD', 'Card Bancar', true, NOW(), NOW()),
('VOUCHER', 'Voucher', true, NOW(), NOW()),
('BANK_TRANSFER', 'Transfer Bancar', true, NOW(), NOW()),
('ADVANCE', 'Avans Petrecere', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 5. STATUSURI BON (Receipt Statuses)
-------------------------------------------------------------------------------
INSERT INTO receipt_statuses (code, label, is_active, created_at, updated_at) VALUES
('OPEN', 'Deschis (In lucru)', true, NOW(), NOW()),
('CLOSED', 'Inchis (Finalizat)', true, NOW(), NOW()),
('CANCELLED', 'Anulat', true, NOW(), NOW()),
('REFUNDED', 'Stornat / Returnat', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 6. TIPURI DE PRODUS (Product Types)
-- REGULAR: Produse cu stoc (se aplica scadere FIFO si verificare HUB).
-- SERVICE: Servicii sau taxe (nu afecteaza stocul).
-------------------------------------------------------------------------------
INSERT INTO product_types (code, label, is_active, created_at, updated_at) VALUES
('REGULAR', 'Produs stoc', true, NOW(), NOW()),
('SERVICE', 'Serviciu', true, NOW(), NOW()),
('CATERING', 'Produs Catering', true, NOW(), NOW()),
('MENU', 'Meniu Configurat', true, NOW(), NOW()),
('ADVANCE', 'Avans Petrecere', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 7. UNITATI DE MASURA (Units of Measure)
-------------------------------------------------------------------------------
INSERT INTO units_of_measure (code, label, is_active, created_at, updated_at) VALUES
('BUC', 'Bucata', true, NOW(), NOW()),
('ACCES', 'Acces', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 8. ROLURI UTILIZATORI (User Roles)
-- ADMIN (100): Acces total la setari, stocuri si rapoarte.
-- CASHIER (50): Acces la vanzare si operatiuni de baza.
-------------------------------------------------------------------------------
INSERT INTO user_roles (code, label, authority_level, is_active, created_at, updated_at) VALUES
('ADMIN', 'Administrator', 100, true, NOW(), NOW()),
('CASHIER', 'Casier', 50, true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 9. COTE TVA (VAT Rates)
-------------------------------------------------------------------------------
INSERT INTO vat_rates (code, label, rate, is_active, created_at, updated_at) VALUES
('TVA21', 'TVA 21% (Standard)', 21.00, true, NOW(), NOW());

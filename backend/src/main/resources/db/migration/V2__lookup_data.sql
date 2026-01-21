-------------------------------------------------------------------------------
-- 1. MOTIVE AJUSTARE STOC (Adjustment Reasons)
-- Folosite în stock_adjustments pentru a justifica plusurile/minusurile la inventar.
-------------------------------------------------------------------------------
INSERT INTO adjustment_reasons (code, label, is_active, created_at, updated_at) VALUES
('DAMAGED', 'Produs Deteriorat', true, NOW(), NOW()),
('EXPIRED', 'Expirat', true, NOW(), NOW()),
('INVENTORY_COUNT', 'Inventar Periodic', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 2. MOTIVE ANULARE BON (Cancel Reasons)
-- Folosite în receipts când un bon deschis este anulat (nu finalizat/stornat).
-------------------------------------------------------------------------------
INSERT INTO cancel_reasons (code, label, is_active, created_at, updated_at) VALUES
('CUSTOMER_REJECTION', 'Refuz client', true, NOW(), NOW()),
('ERROR_ENTRY', 'Eroare operare', true, NOW(), NOW()),
('WRONG_ITEM', 'Produs gresit', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 3. TIPURI MIȘCĂRI NUMERAR (Cash Movement Types)
-- Gestionează fluxul de bani în Cash Drawer și evidența stornărilor.
-- NOTĂ: Include REFUND_CARD pentru a avea toate corecțiile valorice într-un singur loc.
-------------------------------------------------------------------------------
INSERT INTO cash_movement_types (code, label, is_active, created_at, updated_at) VALUES
('SALE', 'Încasare bon fiscal', true, NOW(), NOW()),
('BANK_DEPOSIT', 'Depunere bancă', true, NOW(), NOW()),
('REFUND', 'Storno Numerar (Retur/Anulare)', true, NOW(), NOW()),
('REFUND_CARD', 'Storno Card', true, NOW(), NOW()),
('PAYMENT_SUPPLIER', 'Plată furnizor (Cash)', true, NOW(), NOW()),
('CASH_IN', 'Intrare Numerar (Alimentare)', true, NOW(), NOW()),
('CASH_OUT', 'Ieșire Numerar (Cheltuieli)', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 4. METODE DE PLATĂ (Payment Methods)
-- Codurile CASH, CARD și VOUCHER sunt hardcodate în ReceiptPaymentService.
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
('OPEN', 'Deschis (În lucru)', true, NOW(), NOW()),
('CLOSED', 'Închis (Finalizat)', true, NOW(), NOW()),
('CANCELLED', 'Anulat', true, NOW(), NOW()),
('REFUNDED', 'Stornat / Returnat', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 6. TIPURI DE PRODUS (Product Types)
-- REGULAR: Produse cu stoc (se aplică scădere FIFO și verificare HUB).
-- SERVICE: Servicii sau taxe (nu afectează stocul).
-------------------------------------------------------------------------------
INSERT INTO product_types (code, label, is_active, created_at, updated_at) VALUES
('REGULAR', 'Produs Standard', true, NOW(), NOW()),
('SERVICE', 'Serviciu', true, NOW(), NOW()),
('CATERING', 'Produs Catering', true, NOW(), NOW()),
('MENU', 'Meniu Configurat', true, NOW(), NOW()),
('ADVANCE', 'Avans Petrecere', true, NOW(), NOW());
-------------------------------------------------------------------------------
-- 7. UNITĂȚI DE MĂSURĂ (Units of Measure)
-------------------------------------------------------------------------------
INSERT INTO units_of_measure (code, label, is_active, created_at, updated_at) VALUES
('BUC', 'Bucată', true, NOW(), NOW()),
('ACCES', 'Acces', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 8. ROLURI UTILIZATORI (User Roles)
-- ADMIN (100): Acces total la setări, stocuri și rapoarte.
-- CASHIER (50): Acces la vânzare și operațiuni de bază.
-------------------------------------------------------------------------------
INSERT INTO user_roles (code, label, authority_level, is_active, created_at, updated_at) VALUES
('ADMIN', 'Administrator', 100, true, NOW(), NOW()),
('CASHIER', 'Casier', 50, true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 9. COTE TVA (VAT Rates)
-------------------------------------------------------------------------------
INSERT INTO vat_rates (code, label, rate, is_active, created_at, updated_at) VALUES
('TVA21', 'TVA 21% (Standard)', 21.00, true, NOW(), NOW());
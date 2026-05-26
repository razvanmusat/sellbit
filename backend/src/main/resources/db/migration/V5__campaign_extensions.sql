-------------------------------------------------------------------------------
-- 1. TIPURI CAMPANIE (Campaign Types)
-------------------------------------------------------------------------------
CREATE TABLE campaign_types (
    id   SERIAL PRIMARY KEY,
    code VARCHAR(30)  NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO campaign_types (code, label) VALUES
    ('REGULAR',    'Campanie Regulată'),
    ('GIFT_CARD',  'Card Cadou'),
    ('LOYALTY',    'Card Fidelitate');

-------------------------------------------------------------------------------
-- 2. EXTINDERE voucher_campaigns
-------------------------------------------------------------------------------
-- Adăugăm câmpurile noi (campaign_type_id nullable inițial)
ALTER TABLE voucher_campaigns
    ADD COLUMN campaign_type_id     INTEGER,
    ADD COLUMN vouchers_per_receipt INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN stamps_required      INTEGER;

-- Setăm tip REGULAR la campaniile existente
UPDATE voucher_campaigns
    SET campaign_type_id = (SELECT id FROM campaign_types WHERE code = 'REGULAR');

-- Acum punem NOT NULL + FK
ALTER TABLE voucher_campaigns
    ALTER COLUMN campaign_type_id SET NOT NULL;

ALTER TABLE voucher_campaigns
    ADD CONSTRAINT fk_voucher_campaign_type
        FOREIGN KEY (campaign_type_id) REFERENCES campaign_types(id);

-- discountValue devine nullable pt GIFT_CARD (valoarea vine din bon)
ALTER TABLE voucher_campaigns
    ALTER COLUMN discount_value DROP NOT NULL;

-------------------------------------------------------------------------------
-- 3. JURNAL STAMPILE (Stamp Log)
-------------------------------------------------------------------------------
CREATE TABLE stamp_log (
    id          SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES voucher_campaigns(id),
    cashier_id  INTEGER REFERENCES users(id),
    receipt_id  INTEGER REFERENCES receipts(id),
    given_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 4. TIP PRODUS GIFT_CARD
-------------------------------------------------------------------------------
INSERT INTO product_types (code, label, is_active, created_at, updated_at) VALUES
    ('GIFT_CARD', 'Card Cadou', true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 5. PRODUS "Card Cadou" (in categoria Avans, fara stoc, pret 0)
-------------------------------------------------------------------------------
INSERT INTO products (name, category_id, product_type_id, unit_id, vat_rate_id,
                      sale_price, purchase_price, track_stock, is_active, created_at, updated_at)
VALUES (
    'Card Cadou',
    (SELECT id FROM categories   WHERE code = 'ADVANCE'),
    (SELECT id FROM product_types WHERE code = 'GIFT_CARD'),
    (SELECT id FROM units_of_measure WHERE code = 'BUC'),
    (SELECT id FROM vat_rates    WHERE code = 'TVA21'),
    0.00,
    0.00,
    false,
    true,
    NOW(),
    NOW()
);

-------------------------------------------------------------------------------
-- 6. CAMPANIA "Card Cadou" (inactiva implicit — adminul o activeaza)
-------------------------------------------------------------------------------
INSERT INTO voucher_campaigns (
    name, valid_from_date, valid_until_date, active,
    discount_type, discount_value, max_discount_amount,
    min_amount, valid_days, prefix, code_length,
    campaign_type_id, vouchers_per_receipt,
    created_at, updated_at
) VALUES (
    'Card Cadou',
    '2025-01-01', '2099-12-31',
    false,
    'FIXED', NULL, NULL,
    0.00,
    365, 'GC', 6,
    (SELECT id FROM campaign_types WHERE code = 'GIFT_CARD'),
    1,
    NOW(), NOW()
);

-------------------------------------------------------------------------------
-- 7. PRODUSE OBLIGATORII MULTIPLE PE CAMPANIE
-------------------------------------------------------------------------------
ALTER TABLE voucher_campaigns DROP COLUMN IF EXISTS required_product_id;
ALTER TABLE voucher_campaigns ADD COLUMN required_product_ids INTEGER[];

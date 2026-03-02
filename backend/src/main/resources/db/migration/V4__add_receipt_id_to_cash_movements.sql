ALTER TABLE cash_movements
    ADD COLUMN IF NOT EXISTS receipt_id INT REFERENCES receipts(id);

CREATE INDEX IF NOT EXISTS idx_cash_movements_receipt_id
    ON cash_movements(receipt_id);

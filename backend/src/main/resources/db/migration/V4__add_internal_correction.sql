ALTER TABLE receipts
    ADD COLUMN is_internal_correction BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE playground_reservations
    ADD COLUMN theme_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

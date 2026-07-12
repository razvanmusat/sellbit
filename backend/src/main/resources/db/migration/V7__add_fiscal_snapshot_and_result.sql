-- NOTĂ: statusurile FISCAL_PENDING și FISCAL_FAILED EXISTĂ DEJA în receipt_statuses —
-- inserate manual de utilizator (dev + prod). Nu necesită migrare, verificare sau discuție.

-- Cel mai nou job_id cunoscut de Fisco, persistat ÎNAINTE de POST /api/v1/print.
-- Dacă răspunsul la POST se pierde (fiscal_job_id rămâne NULL), reconcilierea compară lista
-- de joburi Fisco cu acest reper: exact un job mai nou = jobul nostru pierdut (îl adoptăm);
-- zero joburi noi = Fisco n-a primit nimic (retrimitere sigură). Elimină decizia casierului
-- din fluxul de retrimitere.
-- Valoarea 'NONE' = istoricul Fisco era gol la momentul snapshotului (diferit de NULL,
-- care înseamnă că nu s-a trimis nimic pentru bonul respectiv).
ALTER TABLE receipts ADD COLUMN fiscal_snapshot_job_id VARCHAR(100);

-- Datele fiscale returnate de Fisco la status "printed", salvate per recomandarea explicită
-- din manualul Fisco (secțiunea 2.2): numărul bonului, numărul raportului Z și seria
-- imprimantei fiscale. Leagă bonul din aplicație de bonul fizic din memoria fiscală.
ALTER TABLE receipts ADD COLUMN fiscal_slip_number VARCHAR(20);      -- SlipNumber: numărul general al bonului fiscal
ALTER TABLE receipts ADD COLUMN fiscal_z_report_number VARCHAR(20);  -- nZrep: numărul raportului Z în care e inclus bonul
ALTER TABLE receipts ADD COLUMN fiscal_bon_number VARCHAR(20);       -- nFNum: numărul bonului fiscal din raportul Z
ALTER TABLE receipts ADD COLUMN fiscal_device_serial VARCHAR(50);    -- DeviceSerial: seria imprimantei fiscale

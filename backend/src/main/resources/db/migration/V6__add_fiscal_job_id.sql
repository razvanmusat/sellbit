-- job_id primit de la Fisco la acceptarea comenzii de print (POST /api/v1/print).
-- Reținut ca sursă de adevăr 1:1 pentru verificarea de status (GET /api/v1/status?job_id=...),
-- per recomandarea din manualul Fisco — evită ambiguitatea căutării în lista generală de joburi.
ALTER TABLE receipts ADD COLUMN fiscal_job_id VARCHAR(100);

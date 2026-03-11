-------------------------------------------------------------------------------
-- 1. CATEGORII PRINCIPALE (Root Categories)
-------------------------------------------------------------------------------
INSERT INTO categories (code, label, parent_id, is_active, created_at, updated_at) VALUES
('REGULAR', 'Produse', NULL, true, NOW(), NOW()),
('SERVICE', 'Servicii', NULL, true, NOW(), NOW()),
('CATERING', 'Catering', NULL, true, NOW(), NOW()),
('MENU', 'Meniu', NULL, true, NOW(), NOW()),
('ADVANCE', 'Avans', NULL, true, NOW(), NOW()),
('PARTY', 'Petreceri', NULL, true, NOW(), NOW());

-------------------------------------------------------------------------------
-- 2. GESTIUNI IMPLICITE (Warehouses)
-------------------------------------------------------------------------------
INSERT INTO warehouses (code, name, is_active, created_at) VALUES
('GV', 'Gestiune Vânzare', true, NOW()),
('GR', 'Gestiune Reglaj', true, NOW()),
('GP', 'Gestiune Petrecere', true, NOW());

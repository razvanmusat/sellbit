-------------------------------------------------------------------------------
-- 1. CATEGORII PRINCIPALE (Root Categories)
-------------------------------------------------------------------------------
INSERT INTO categories (code, label, parent_id, is_active, created_at, updated_at) VALUES
('REGULAR', 'Produse', NULL, true, NOW(), NOW()),
('SERVICE', 'Servicii', NULL, true, NOW(), NOW()),
('CATERING', 'Catering', NULL, true, NOW(), NOW()),
('MENU', 'Meniu', NULL, true, NOW(), NOW()),
('ADVANCE', 'Avans', NULL, true, NOW(), NOW());

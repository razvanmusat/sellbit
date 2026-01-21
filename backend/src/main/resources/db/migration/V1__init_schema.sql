-------------------------------------------------------------------------------
-- 1. TABELE DE NOMENCLATOR (Fără dependințe)
-------------------------------------------------------------------------------

CREATE TABLE store (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    vat_number VARCHAR(50) NOT NULL,
    registration_number VARCHAR(50) NOT NULL,
    bank_account VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE warehouses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE receipt_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE units_of_measure (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cash_movement_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE adjustment_reasons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    authority_level INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vat_rates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cancel_reasons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE playground_reservations (
    id SERIAL PRIMARY KEY,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    parent_name VARCHAR(100) NOT NULL,
    parent_phone VARCHAR(30) NOT NULL,
    advance_amount DECIMAL(10,2),
    advance_paid_at TIMESTAMP,
    digital_invitation BOOLEAN DEFAULT FALSE,
    theme VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_playground_res_dates ON playground_reservations (start_at, end_at);

-------------------------------------------------------------------------------
-- 2. TABELE CU IERARHIE SAU DEPENDENȚE SIMPLE
-------------------------------------------------------------------------------

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(100) NOT NULL,
    parent_id INT REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR NOT NULL,
    full_name VARCHAR,
    role_id INT NOT NULL REFERENCES user_roles(id),
    language_code VARCHAR(10) DEFAULT 'ro',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    deactivated_at TIMESTAMP
);

-------------------------------------------------------------------------------
-- 3. PRODUSE ȘI ENTITĂȚI CORE (Inclusiv Rețetar)
-------------------------------------------------------------------------------

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    barcode VARCHAR(50) UNIQUE,
    category_id INT NOT NULL REFERENCES categories(id),
    product_type_id INT NOT NULL REFERENCES product_types(id),
    unit_id INT NOT NULL REFERENCES units_of_measure(id),
    sale_price DECIMAL(10, 2),
    purchase_price DECIMAL(10, 2),
    vat_rate_id INT REFERENCES vat_rates(id),
    track_stock BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_type ON products(product_type_id);
CREATE INDEX idx_products_vat ON products(vat_rate_id);

-- NOU: Tabela de rețetar (Product Components)
CREATE TABLE product_components (
    id SERIAL PRIMARY KEY,
    parent_product_id INTEGER NOT NULL REFERENCES products(id),
    child_product_id INTEGER NOT NULL REFERENCES products(id),
    quantity DECIMAL(10,3) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 4. GESTIUNE ȘI CASH
-------------------------------------------------------------------------------

CREATE TABLE cash_drawer (
    id SERIAL PRIMARY KEY,
    warehouse_id INT NOT NULL UNIQUE REFERENCES warehouses(id),
    current_balance DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE cash_movements (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    movement_type_id INT NOT NULL REFERENCES cash_movement_types(id),
    amount DECIMAL(10, 2),
    user_id INT NOT NULL REFERENCES users(id),
    note TEXT
);

CREATE TABLE stock_current (
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    product_id INT NOT NULL REFERENCES products(id),
    quantity DECIMAL(10, 3) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (warehouse_id, product_id)
);

CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    user_id INT NOT NULL REFERENCES users(id),
    quantity DECIMAL(10, 3),
    purchase_price DECIMAL(10, 2),
    purchased_at TIMESTAMP,
    expiration_date DATE,
    remaining_quantity DECIMAL(10, 3),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_adjustments (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    user_id INT NOT NULL REFERENCES users(id),
    quantity_change DECIMAL(10, 3),
    reason_id INT NOT NULL REFERENCES adjustment_reasons(id),
    adjusted_at TIMESTAMP,
    note TEXT
);

-------------------------------------------------------------------------------
-- 5. TRANZACȚII (BONURI FISCALE)
-------------------------------------------------------------------------------

CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    status_id INT NOT NULL REFERENCES receipt_statuses(id),
    original_receipt_id INT REFERENCES receipts(id),
    table_name VARCHAR(50),
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    user_id INT REFERENCES users(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    total_net DECIMAL(10, 2),
    total_vat DECIMAL(10, 2),
    cancel_reason_id INT REFERENCES cancel_reasons(id),
    note TEXT
);

CREATE TABLE receipt_items (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    receipt_id INT NOT NULL REFERENCES receipts(id),
    quantity DECIMAL(10, 3),
    unit_price DECIMAL(10, 2),
    purchase_unit_price DECIMAL(10, 2),
    line_total DECIMAL(10, 2),
    vat_rate DECIMAL(5, 2),
    net_total DECIMAL(10, 2),
    vat_total DECIMAL(10, 2),
    service_end_at TIMESTAMP,
    is_service_time BOOLEAN DEFAULT FALSE
);

CREATE TABLE receipt_payments (
    id SERIAL PRIMARY KEY,
    receipt_id INT NOT NULL REFERENCES receipts(id),
    payment_method_id INT NOT NULL REFERENCES payment_methods(id),
    amount DECIMAL(10, 2) NOT NULL,
    paid_at TIMESTAMP DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 6. VOUCHERE ȘI COMENZI CATERING
-------------------------------------------------------------------------------

CREATE TABLE voucher_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    valid_from_date DATE NOT NULL,
    valid_until_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    discount_type VARCHAR,
    discount_value DECIMAL(10,2),
    min_hours_played INT,
    min_amount DECIMAL(10,2),
    required_product_id INT,
    applicable_product_id INT,
    valid_days INT DEFAULT 30,
    applicable_days VARCHAR(50),
    prefix VARCHAR(20) DEFAULT 'JOACA-',
    code_length INT DEFAULT 4,
    receipt_template TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE customer_vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    campaign_id INT NOT NULL REFERENCES voucher_campaigns(id) ON DELETE CASCADE,
    discount_type VARCHAR,
    discount_value DECIMAL(10,2),
    expires_at TIMESTAMP,
    issued_receipt_id INT REFERENCES receipts(id) ON DELETE RESTRICT,
    used_receipt_id INT UNIQUE REFERENCES receipts(id) ON DELETE RESTRICT,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE catering_orders (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    reservation_id INT REFERENCES playground_reservations(id) ON DELETE CASCADE,
    quantity INT NOT NULL,
    order_date DATE NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-------------------------------------------------------------------------------
-- 7. INDEXURI ADIȚIONALE
-------------------------------------------------------------------------------
CREATE INDEX idx_receipts_warehouse ON receipts(warehouse_id);
CREATE INDEX idx_receipts_created ON receipts(created_at);
CREATE INDEX idx_stock_current_product ON stock_current(product_id);
CREATE INDEX idx_customer_vouchers_code ON customer_vouchers(code);
ALTER TABLE voucher_campaigns ADD CONSTRAINT fk_vc_required_product FOREIGN KEY (required_product_id) REFERENCES products(id);
ALTER TABLE voucher_campaigns ADD CONSTRAINT fk_vc_applicable_product FOREIGN KEY (applicable_product_id) REFERENCES products(id);
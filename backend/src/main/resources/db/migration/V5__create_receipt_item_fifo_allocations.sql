CREATE TABLE IF NOT EXISTS receipt_item_fifo_allocations (
    id SERIAL PRIMARY KEY,
    receipt_id INT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    receipt_item_id INT NOT NULL REFERENCES receipt_items(id) ON DELETE CASCADE,
    purchase_id INT NOT NULL REFERENCES purchases(id),
    warehouse_id INT NOT NULL REFERENCES warehouses(id),
    quantity DECIMAL(10, 3) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

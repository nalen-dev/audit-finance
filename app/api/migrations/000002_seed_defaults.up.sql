-- Default Global Categories (user_id is NULL, is_default = TRUE)

-- EXPENSES
INSERT INTO categories (name, code, type, icon, color, is_default) VALUES
('Makanan & Minuman', 'MK', 'expense', 'utensils', '#EF4444', TRUE),
('Transportasi', 'TR', 'expense', 'car', '#F59E0B', TRUE),
('Belanja & Kebutuhan', 'BL', 'expense', 'shopping-bag', '#EC4899', TRUE),
('Tagihan & Utilitas', 'TG', 'expense', 'zap', '#8B5CF6', TRUE),
('Hiburan & Rekreasi', 'HB', 'expense', 'film', '#3B82F6', TRUE),
('Kesehatan & Medis', 'KS', 'expense', 'heart-pulse', '#10B981', TRUE),
('Pendidikan & Buku', 'PD', 'expense', 'book-open', '#6366F1', TRUE),
('Lain-lain', 'LL', 'expense', 'more-horizontal', '#6B7280', TRUE)
ON CONFLICT DO NOTHING;

-- INCOMES
INSERT INTO categories (name, code, type, icon, color, is_default) VALUES
('Gaji Utama', 'GJ', 'income', 'briefcase', '#10B981', TRUE),
('Bonus & THR', 'BN', 'income', 'gift', '#059669', TRUE),
('Hasil Investasi', 'IV', 'income', 'trending-up', '#34D399', TRUE),
('Freelance / Proyek', 'FL', 'income', 'laptop', '#047857', TRUE),
('Pemasukan Lainnya', 'PL', 'income', 'plus-circle', '#6EE7B7', TRUE)
ON CONFLICT DO NOTHING;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    telegram_chat_id BIGINT UNIQUE,
    app_mode VARCHAR(20) DEFAULT NULL,
    budget_cycle_start_day INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);

-- ============================================================================
-- 2. WALLETS (Multi-Wallet Support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'bank', -- 'cash', 'bank', 'ewallet', 'credit_card', 'investment', 'other'
    currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    color VARCHAR(30) NOT NULL DEFAULT '#10B981',
    icon VARCHAR(50) NOT NULL DEFAULT 'wallet',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- ============================================================================
-- 3. CATEGORIES (Default & Custom Personalized)
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL means system default template
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    icon VARCHAR(50) NOT NULL DEFAULT 'tag',
    color VARCHAR(30) NOT NULL DEFAULT '#6B7280',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);

-- ============================================================================
-- 4. TRANSACTIONS (CRUD with source tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
    destination_wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT, -- for wallet transfer
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    source VARCHAR(20) NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram', 'android', 'system')),
    use_savings BOOLEAN NOT NULL DEFAULT FALSE,
    use_vault BOOLEAN NOT NULL DEFAULT FALSE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_time TIME NOT NULL DEFAULT CURRENT_TIME,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

-- ============================================================================
-- 5. BUDGETS (Daily, Weekly, Monthly Targets & Overspending Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE, -- NULL means total spending target
    period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
    target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
    alert_threshold_percentage INT NOT NULL DEFAULT 80 CHECK (alert_threshold_percentage BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_category_period UNIQUE (user_id, category_id, period)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);

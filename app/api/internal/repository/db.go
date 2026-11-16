package repository

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"finance-audit/api/internal/config"
)

func NewDB(cfg *config.Config) (*sql.DB, error) {
	db, err := sql.Open("postgres", cfg.GetDSN())
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Idempotent migrations for existing installations
	_, _ = db.Exec(`
		ALTER TABLE users ADD COLUMN IF NOT EXISTS app_mode VARCHAR(20) DEFAULT NULL;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS budget_cycle_start_day INT DEFAULT 1;
		ALTER TABLE categories ADD COLUMN IF NOT EXISTS code VARCHAR(10);

		CREATE TABLE IF NOT EXISTS savings_goals (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(120) NOT NULL,
			target_amount NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
			current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (current_amount >= 0),
			target_date DATE,
			icon VARCHAR(50) NOT NULL DEFAULT 'target',
			color VARCHAR(30) NOT NULL DEFAULT '#10B981',
			note TEXT,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);

		-- Migrate legacy monthly total budget to daily if user doesn't have a daily budget yet
		INSERT INTO budgets (user_id, category_id, period, target_amount, alert_threshold_percentage)
		SELECT user_id, NULL, 'daily', GREATEST(1, ROUND(target_amount / 30.0)), alert_threshold_percentage
		FROM budgets b
		WHERE b.category_id IS NULL AND b.period = 'monthly'
		  AND NOT EXISTS (
			SELECT 1 FROM budgets d WHERE d.user_id = b.user_id AND d.category_id IS NULL AND d.period = 'daily'
		  );

		-- Clean up obsolete weekly and monthly total budgets
		DELETE FROM budgets WHERE category_id IS NULL AND period IN ('weekly', 'monthly');
	`)

	return db, nil
}

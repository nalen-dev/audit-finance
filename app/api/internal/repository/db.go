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
	`)

	return db, nil
}

package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
)

type WalletHandler struct {
	db *sql.DB
}

func NewWalletHandler(db *sql.DB) *WalletHandler {
	return &WalletHandler{db: db}
}

type CreateWalletRequest struct {
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	Currency       string  `json:"currency"`
	InitialBalance float64 `json:"initial_balance"`
	Color          string  `json:"color"`
	Icon           string  `json:"icon"`
	IsDefault      bool    `json:"is_default"`
}

func (h *WalletHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	query := `
		SELECT id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_default, created_at, updated_at
		FROM wallets
		WHERE user_id = $1
		ORDER BY is_default DESC, name ASC
	`
	rows, err := h.db.QueryContext(r.Context(), query, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch wallets")
		return
	}
	defer rows.Close()

	wallets := make([]model.Wallet, 0)
	for rows.Next() {
		var wItem model.Wallet
		if err := rows.Scan(
			&wItem.ID, &wItem.UserID, &wItem.Name, &wItem.Type, &wItem.Currency,
			&wItem.InitialBalance, &wItem.CurrentBalance, &wItem.Color, &wItem.Icon,
			&wItem.IsDefault, &wItem.CreatedAt, &wItem.UpdatedAt,
		); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to parse wallet row")
			return
		}
		wallets = append(wallets, wItem)
	}

	respondJSON(w, http.StatusOK, wallets)
}

func (h *WalletHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateWalletRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Wallet name is required")
		return
	}
	if req.Currency == "" {
		req.Currency = "IDR"
	}
	if req.Type == "" {
		req.Type = "bank"
	}
	if req.Color == "" {
		req.Color = "#10B981"
	}
	if req.Icon == "" {
		req.Icon = "wallet"
	}

	var wallet model.Wallet
	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database transaction error")
		return
	}
	defer tx.Rollback()

	var existingCount int
	_ = tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM wallets WHERE user_id = $1`, userID).Scan(&existingCount)
	if existingCount == 0 {
		req.IsDefault = true
	}

	if req.IsDefault {
		if _, err := tx.ExecContext(r.Context(), `UPDATE wallets SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_default = TRUE`, userID); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to update existing default wallet")
			return
		}
	}

	query := `
		INSERT INTO wallets (user_id, name, type, currency, initial_balance, current_balance, color, icon, is_default)
		VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
		RETURNING id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_default, created_at, updated_at
	`
	err = tx.QueryRowContext(
		r.Context(), query,
		userID, req.Name, req.Type, req.Currency, req.InitialBalance, req.Color, req.Icon, req.IsDefault,
	).Scan(
		&wallet.ID, &wallet.UserID, &wallet.Name, &wallet.Type, &wallet.Currency,
		&wallet.InitialBalance, &wallet.CurrentBalance, &wallet.Color, &wallet.Icon,
		&wallet.IsDefault, &wallet.CreatedAt, &wallet.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create wallet")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit wallet creation")
		return
	}

	respondJSON(w, http.StatusCreated, wallet)
}

func (h *WalletHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	walletIDStr := chi.URLParam(r, "id")
	walletID, err := uuid.Parse(walletIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid wallet ID")
		return
	}

	var req CreateWalletRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Wallet name is required")
		return
	}
	if req.Type == "" {
		req.Type = "bank"
	}
	if req.Color == "" {
		req.Color = "#10B981"
	}
	if req.Icon == "" {
		req.Icon = "wallet"
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database transaction error")
		return
	}
	defer tx.Rollback()

	var currentDefault bool
	err = tx.QueryRowContext(r.Context(), `SELECT is_default FROM wallets WHERE id = $1 AND user_id = $2`, walletID, userID).Scan(&currentDefault)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Wallet not found")
		return
	} else if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to check wallet")
		return
	}

	if req.IsDefault {
		if _, err := tx.ExecContext(r.Context(), `UPDATE wallets SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND id <> $2 AND is_default = TRUE`, userID, walletID); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to clear previous default wallet")
			return
		}
	} else if currentDefault {
		var otherDefaultCount int
		_ = tx.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM wallets WHERE user_id = $1 AND id <> $2 AND is_default = TRUE`, userID, walletID).Scan(&otherDefaultCount)
		if otherDefaultCount == 0 {
			req.IsDefault = true
		}
	}

	query := `
		UPDATE wallets
		SET name = $1, type = $2, color = $3, icon = $4, is_default = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6 AND user_id = $7
		RETURNING id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_default, created_at, updated_at
	`
	var wallet model.Wallet
	err = tx.QueryRowContext(
		r.Context(), query,
		req.Name, req.Type, req.Color, req.Icon, req.IsDefault, walletID, userID,
	).Scan(
		&wallet.ID, &wallet.UserID, &wallet.Name, &wallet.Type, &wallet.Currency,
		&wallet.InitialBalance, &wallet.CurrentBalance, &wallet.Color, &wallet.Icon,
		&wallet.IsDefault, &wallet.CreatedAt, &wallet.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update wallet")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit wallet update")
		return
	}

	respondJSON(w, http.StatusOK, wallet)
}

func (h *WalletHandler) SetDefault(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	walletIDStr := chi.URLParam(r, "id")
	walletID, err := uuid.Parse(walletIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid wallet ID")
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database transaction error")
		return
	}
	defer tx.Rollback()

	var exists bool
	if err := tx.QueryRowContext(r.Context(), `SELECT EXISTS(SELECT 1 FROM wallets WHERE id = $1 AND user_id = $2)`, walletID, userID).Scan(&exists); err != nil || !exists {
		respondError(w, http.StatusNotFound, "Wallet not found")
		return
	}

	if _, err := tx.ExecContext(r.Context(), `UPDATE wallets SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND is_default = TRUE`, userID); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to clear existing default wallet")
		return
	}

	var wallet model.Wallet
	query := `
		UPDATE wallets
		SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_default, created_at, updated_at
	`
	if err := tx.QueryRowContext(r.Context(), query, walletID, userID).Scan(
		&wallet.ID, &wallet.UserID, &wallet.Name, &wallet.Type, &wallet.Currency,
		&wallet.InitialBalance, &wallet.CurrentBalance, &wallet.Color, &wallet.Icon,
		&wallet.IsDefault, &wallet.CreatedAt, &wallet.UpdatedAt,
	); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to set default wallet")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit default wallet")
		return
	}

	respondJSON(w, http.StatusOK, wallet)
}

func (h *WalletHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	walletIDStr := chi.URLParam(r, "id")
	walletID, err := uuid.Parse(walletIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid wallet ID")
		return
	}

	var isDefault bool
	err = h.db.QueryRowContext(r.Context(), `SELECT is_default FROM wallets WHERE id = $1 AND user_id = $2`, walletID, userID).Scan(&isDefault)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Wallet not found")
		return
	}
	if isDefault {
		respondError(w, http.StatusBadRequest, "Dompet default tidak dapat dihapus. Pilih dompet lain sebagai default terlebih dahulu.")
		return
	}

	// Check if transactions exist (source or transfer destination)
	var count int
	_ = h.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM transactions WHERE wallet_id = $1 OR destination_wallet_id = $1`, walletID).Scan(&count)
	if count > 0 {
		respondError(w, http.StatusBadRequest, "Dompet dengan riwayat transaksi tidak dapat dihapus.")
		return
	}

	query := `DELETE FROM wallets WHERE id = $1 AND user_id = $2`
	res, err := h.db.ExecContext(r.Context(), query, walletID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete wallet")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		respondError(w, http.StatusNotFound, "Wallet not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Wallet deleted successfully"})
}

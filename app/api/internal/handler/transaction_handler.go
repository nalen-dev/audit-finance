package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
)

type TransactionHandler struct {
	db *sql.DB
}

func NewTransactionHandler(db *sql.DB) *TransactionHandler {
	return &TransactionHandler{db: db}
}

type CreateTransactionRequest struct {
	WalletID            uuid.UUID  `json:"wallet_id"`
	CategoryID          *uuid.UUID `json:"category_id,omitempty"`
	DestinationWalletID *uuid.UUID `json:"destination_wallet_id,omitempty"`
	Amount              float64    `json:"amount"`
	Type                string     `json:"type"`        // 'expense', 'income', 'transfer'
	Source              string     `json:"source"`      // 'web', 'telegram', 'android'
	UseSavings          bool       `json:"use_savings"` // true jika diambil dari tabungan berjalan
	UseVault            bool       `json:"use_vault"`   // true jika diambil dari tabungan aman / vault
	TransactionDate     string     `json:"transaction_date"` // YYYY-MM-DD
	TransactionTime     string     `json:"transaction_time"` // HH:MM:SS
	Note                *string    `json:"note,omitempty"`
}

func (h *TransactionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	q := r.URL.Query()
	limit := 50
	if l := q.Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	offset := 0
	if o := q.Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	whereClause := " WHERE t.user_id = $1"
	filterArgs := []interface{}{userID}
	argIdx := 2

	if walletID := q.Get("wallet_id"); walletID != "" {
		whereClause += fmt.Sprintf(" AND t.wallet_id = $%d", argIdx)
		filterArgs = append(filterArgs, walletID)
		argIdx++
	}

	if catID := q.Get("category_id"); catID != "" {
		whereClause += fmt.Sprintf(" AND t.category_id = $%d", argIdx)
		filterArgs = append(filterArgs, catID)
		argIdx++
	}

	if txType := q.Get("type"); txType != "" {
		whereClause += fmt.Sprintf(" AND t.type = $%d", argIdx)
		filterArgs = append(filterArgs, txType)
		argIdx++
	}

	if startDate := q.Get("start_date"); startDate != "" {
		whereClause += fmt.Sprintf(" AND t.transaction_date >= $%d", argIdx)
		filterArgs = append(filterArgs, startDate)
		argIdx++
	}

	if endDate := q.Get("end_date"); endDate != "" {
		whereClause += fmt.Sprintf(" AND t.transaction_date <= $%d", argIdx)
		filterArgs = append(filterArgs, endDate)
		argIdx++
	}

	var totalCount int
	countQuery := "SELECT COUNT(*) FROM transactions t" + whereClause
	if err := h.db.QueryRowContext(r.Context(), countQuery, filterArgs...).Scan(&totalCount); err != nil {
		totalCount = 0
	}

	query := `
		SELECT 
			t.id, t.user_id, t.wallet_id, t.category_id, t.destination_wallet_id,
			t.amount, t.type, t.source, t.use_savings, t.use_vault, t.transaction_date, t.transaction_time, t.note,
			t.created_at, t.updated_at,
			w.name as wallet_name,
			COALESCE(c.name, 'Transfer Dompet') as category_name, 
			COALESCE(c.icon, 'arrow-left-right') as category_icon, 
			COALESCE(c.color, '#6366F1') as category_color
		FROM transactions t
		LEFT JOIN wallets w ON t.wallet_id = w.id
		LEFT JOIN categories c ON t.category_id = c.id
	` + whereClause + fmt.Sprintf(" ORDER BY t.transaction_date DESC, t.transaction_time DESC, t.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)

	queryArgs := append(filterArgs, limit, offset)

	rows, err := h.db.QueryContext(r.Context(), query, queryArgs...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch transactions")
		return
	}
	defer rows.Close()

	transactions := make([]model.Transaction, 0)
	for rows.Next() {
		var t model.Transaction
		var catID sql.NullString
		var destWallet sql.NullString
		var note sql.NullString
		var tDate time.Time
		var tTime string

		if err := rows.Scan(
			&t.ID, &t.UserID, &t.WalletID, &catID, &destWallet,
			&t.Amount, &t.Type, &t.Source, &t.UseSavings, &t.UseVault, &tDate, &tTime, &note,
			&t.CreatedAt, &t.UpdatedAt,
			&t.WalletName, &t.CategoryName, &t.CategoryIcon, &t.CategoryColor,
		); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to parse transaction row: "+err.Error())
			return
		}

		if catID.Valid {
			if parsed, err := uuid.Parse(catID.String); err == nil {
				t.CategoryID = &parsed
			}
		}

		t.TransactionDate = tDate.Format("2006-01-02")
		t.TransactionTime = tTime
		if note.Valid {
			t.Note = &note.String
		}
		if destWallet.Valid {
			if parsed, err := uuid.Parse(destWallet.String); err == nil {
				t.DestinationWalletID = &parsed
			}
		}

		transactions = append(transactions, t)
	}

	totalPages := 0
	if limit > 0 {
		totalPages = int(math.Ceil(float64(totalCount) / float64(limit)))
	}
	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"transactions": transactions,
		"total":        totalCount,
		"page":         page,
		"limit":        limit,
		"total_pages":  totalPages,
	})
}

func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Amount <= 0 {
		respondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}
	if req.Type != "expense" && req.Type != "income" && req.Type != "transfer" {
		respondError(w, http.StatusBadRequest, "Type must be 'expense', 'income', or 'transfer'")
		return
	}
	if req.Type != "transfer" && req.CategoryID == nil {
		respondError(w, http.StatusBadRequest, "Category is required for expense and income")
		return
	}
	if req.Type == "transfer" && req.DestinationWalletID == nil {
		respondError(w, http.StatusBadRequest, "Destination wallet is required for transfer")
		return
	}
	if req.Type == "transfer" && req.DestinationWalletID != nil && req.WalletID == *req.DestinationWalletID {
		respondError(w, http.StatusBadRequest, "Source and destination wallets cannot be the same")
		return
	}
	if req.Source == "" {
		req.Source = "web"
	}
	if req.TransactionDate == "" {
		req.TransactionDate = time.Now().Format("2006-01-02")
	}
	if req.TransactionTime == "" {
		req.TransactionTime = time.Now().Format("15:04:05")
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database transaction error")
		return
	}
	defer tx.Rollback()

	// 1. Insert transaction
	var txID uuid.UUID
	insertQuery := `
		INSERT INTO transactions (
			user_id, wallet_id, category_id, destination_wallet_id,
			amount, type, source, use_savings, use_vault, transaction_date, transaction_time, note
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING id
	`
	err = tx.QueryRowContext(
		r.Context(), insertQuery,
		userID, req.WalletID, req.CategoryID, req.DestinationWalletID,
		req.Amount, req.Type, req.Source, req.UseSavings, req.UseVault, req.TransactionDate, req.TransactionTime, req.Note,
	).Scan(&txID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to record transaction: "+err.Error())
		return
	}

	// 2. Adjust wallet current balance
	switch req.Type {
	case "expense":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, req.WalletID, userID)
	case "income":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, req.WalletID, userID)
	case "transfer":
		if req.DestinationWalletID == nil {
			respondError(w, http.StatusBadRequest, "Destination wallet is required for transfer")
			return
		}
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, req.WalletID, userID)
		if err == nil {
			_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, *req.DestinationWalletID, userID)
		}
	}

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update wallet balance")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"id":      txID,
		"message": "Transaction recorded successfully",
	})
}

func (h *TransactionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	txIDStr := chi.URLParam(r, "id")
	txID, err := uuid.Parse(txIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid transaction ID")
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer tx.Rollback()

	// Get original transaction details
	var walletID uuid.UUID
	var destWalletID sql.NullString
	var amount float64
	var txType string

	err = tx.QueryRowContext(r.Context(), `
		SELECT wallet_id, destination_wallet_id, amount, type 
		FROM transactions 
		WHERE id = $1 AND user_id = $2
	`, txID, userID).Scan(&walletID, &destWalletID, &amount, &txType)
	if err != nil {
		respondError(w, http.StatusNotFound, "Transaction not found")
		return
	}

	// Reverse balance changes
	switch txType {
	case "expense":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`, amount, walletID)
	case "income":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`, amount, walletID)
	case "transfer":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`, amount, walletID)
		if err == nil && destWalletID.Valid {
			_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`, amount, destWalletID.String)
		}
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to reverse wallet balance")
		return
	}

	// Delete transaction
	_, err = tx.ExecContext(r.Context(), `DELETE FROM transactions WHERE id = $1 AND user_id = $2`, txID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete transaction")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Commit failed")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Transaction deleted successfully"})
}

func (h *TransactionHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	txIDStr := chi.URLParam(r, "id")
	txID, err := uuid.Parse(txIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid transaction ID")
		return
	}

	var req CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Amount <= 0 {
		respondError(w, http.StatusBadRequest, "Amount must be greater than zero")
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database error")
		return
	}
	defer tx.Rollback()

	// 1. Get original transaction details
	var oldWalletID uuid.UUID
	var oldDestWalletID sql.NullString
	var oldAmount float64
	var oldTxType string

	err = tx.QueryRowContext(r.Context(), `
		SELECT wallet_id, destination_wallet_id, amount, type 
		FROM transactions 
		WHERE id = $1 AND user_id = $2
	`, txID, userID).Scan(&oldWalletID, &oldDestWalletID, &oldAmount, &oldTxType)
	if err != nil {
		respondError(w, http.StatusNotFound, "Transaction not found")
		return
	}

	// 2. Revert previous wallet balance impact
	switch oldTxType {
	case "expense":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`, oldAmount, oldWalletID)
	case "income":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`, oldAmount, oldWalletID)
	case "transfer":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1 WHERE id = $2`, oldAmount, oldWalletID)
		if err == nil && oldDestWalletID.Valid {
			_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1 WHERE id = $2`, oldAmount, oldDestWalletID.String)
		}
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to revert wallet balance")
		return
	}

	// 3. Update transaction record
	updateQuery := `
		UPDATE transactions
		SET wallet_id = $1, category_id = $2, destination_wallet_id = $3,
		    amount = $4, type = $5, use_savings = $6, use_vault = $7,
		    transaction_date = $8, note = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $10 AND user_id = $11
	`
	_, err = tx.ExecContext(
		r.Context(), updateQuery,
		req.WalletID, req.CategoryID, req.DestinationWalletID,
		req.Amount, req.Type, req.UseSavings, req.UseVault,
		req.TransactionDate, req.Note, txID, userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update transaction: "+err.Error())
		return
	}

	// 4. Apply new wallet balance impact
	switch req.Type {
	case "expense":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, req.WalletID, userID)
	case "income":
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, req.WalletID, userID)
	case "transfer":
		if req.DestinationWalletID == nil {
			respondError(w, http.StatusBadRequest, "Destination wallet is required for transfer")
			return
		}
		_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, req.WalletID, userID)
		if err == nil {
			_, err = tx.ExecContext(r.Context(), `UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`, req.Amount, *req.DestinationWalletID, userID)
		}
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update new wallet balance")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit update transaction")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Transaction updated successfully"})
}

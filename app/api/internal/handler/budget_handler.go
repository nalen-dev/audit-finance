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

type BudgetHandler struct {
	db *sql.DB
}

func NewBudgetHandler(db *sql.DB) *BudgetHandler {
	return &BudgetHandler{db: db}
}

type SetBudgetRequest struct {
	CategoryID               *uuid.UUID `json:"category_id,omitempty"`
	Period                   string     `json:"period"` // 'daily', 'weekly', 'monthly'
	TargetAmount             float64    `json:"target_amount"`
	AlertThresholdPercentage int        `json:"alert_threshold_percentage"`
}

func (h *BudgetHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	query := `
		SELECT 
			b.id, b.user_id, b.category_id, b.period, b.target_amount, b.alert_threshold_percentage,
			b.created_at, b.updated_at,
			c.name as category_name
		FROM budgets b
		LEFT JOIN categories c ON b.category_id = c.id
		WHERE b.user_id = $1
		  AND b.period = 'daily'
		ORDER BY (b.category_id IS NOT NULL) ASC, c.name ASC
	`
	rows, err := h.db.QueryContext(r.Context(), query, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch budgets: "+err.Error())
		return
	}
	defer rows.Close()

	budgets := make([]model.Budget, 0)
	for rows.Next() {
		var b model.Budget
		var catName sql.NullString
		if err := rows.Scan(
			&b.ID, &b.UserID, &b.CategoryID, &b.Period, &b.TargetAmount, &b.AlertThresholdPercentage,
			&b.CreatedAt, &b.UpdatedAt, &catName,
		); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to parse budget: "+err.Error())
			return
		}
		if catName.Valid {
			b.CategoryName = &catName.String
		}

		spendQuery := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = $1 AND type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL) AND (use_vault IS FALSE OR use_vault IS NULL) AND transaction_date = CURRENT_DATE`
		spendArgs := []interface{}{userID}

		if b.CategoryID != nil {
			spendQuery += " AND category_id = $2"
			spendArgs = append(spendArgs, *b.CategoryID)
		}

		_ = h.db.QueryRowContext(r.Context(), spendQuery, spendArgs...).Scan(&b.SpentAmount)

		b.RemainingAmount = b.TargetAmount - b.SpentAmount

		if b.TargetAmount > 0 {
			b.Percentage = (b.SpentAmount / b.TargetAmount) * 100
		}
		b.IsWarning = b.Percentage >= float64(b.AlertThresholdPercentage)
		b.IsOverspent = b.Percentage >= 100.0

		budgets = append(budgets, b)
	}

	respondJSON(w, http.StatusOK, budgets)
}

func (h *BudgetHandler) Set(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req SetBudgetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.TargetAmount <= 0 {
		respondError(w, http.StatusBadRequest, "Target amount must be greater than zero")
		return
	}
	if req.Period == "" {
		req.Period = "daily"
	}
	if req.Period != "daily" {
		respondError(w, http.StatusBadRequest, "Target anggaran pengeluaran hanya menggunakan periode harian ('daily')")
		return
	}
	if req.AlertThresholdPercentage <= 0 || req.AlertThresholdPercentage > 100 {
		req.AlertThresholdPercentage = 80
	}

	var b model.Budget
	var err error
	if req.CategoryID == nil {
		// Remove any legacy weekly/monthly total targets if still present
		_, _ = h.db.ExecContext(r.Context(), `DELETE FROM budgets WHERE user_id = $1 AND category_id IS NULL AND period <> 'daily'`, userID)

		upsertQuery := `
			INSERT INTO budgets (user_id, category_id, period, target_amount, alert_threshold_percentage)
			VALUES ($1, NULL, 'daily', $2, $3)
			ON CONFLICT (user_id, category_id, period)
			DO UPDATE SET target_amount = EXCLUDED.target_amount, alert_threshold_percentage = EXCLUDED.alert_threshold_percentage, updated_at = CURRENT_TIMESTAMP
			RETURNING id, user_id, category_id, period, target_amount, alert_threshold_percentage, created_at, updated_at
		`
		err = h.db.QueryRowContext(
			r.Context(), upsertQuery,
			userID, req.TargetAmount, req.AlertThresholdPercentage,
		).Scan(
			&b.ID, &b.UserID, &b.CategoryID, &b.Period, &b.TargetAmount, &b.AlertThresholdPercentage,
			&b.CreatedAt, &b.UpdatedAt,
		)
	} else {
		query := `
			INSERT INTO budgets (user_id, category_id, period, target_amount, alert_threshold_percentage)
			VALUES ($1, $2, 'daily', $3, $4)
			ON CONFLICT (user_id, category_id, period)
			DO UPDATE SET 
				target_amount = EXCLUDED.target_amount,
				alert_threshold_percentage = EXCLUDED.alert_threshold_percentage,
				updated_at = CURRENT_TIMESTAMP
			RETURNING id, user_id, category_id, period, target_amount, alert_threshold_percentage, created_at, updated_at
		`
		err = h.db.QueryRowContext(
			r.Context(), query,
			userID, req.CategoryID, req.TargetAmount, req.AlertThresholdPercentage,
		).Scan(
			&b.ID, &b.UserID, &b.CategoryID, &b.Period, &b.TargetAmount, &b.AlertThresholdPercentage,
			&b.CreatedAt, &b.UpdatedAt,
		)
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to set budget: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, b)
}

func (h *BudgetHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	budgetIDStr := chi.URLParam(r, "id")
	budgetID, err := uuid.Parse(budgetIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid budget ID")
		return
	}

	res, err := h.db.ExecContext(r.Context(), `DELETE FROM budgets WHERE id = $1 AND user_id = $2`, budgetID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete budget")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		respondError(w, http.StatusNotFound, "Budget not found")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Budget deleted successfully"})
}

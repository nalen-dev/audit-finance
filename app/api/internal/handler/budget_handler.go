package handler

import (
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
	"finance-audit/api/internal/service"
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
		ORDER BY 
			CASE b.period 
				WHEN 'daily' THEN 1 
				WHEN 'weekly' THEN 2 
				WHEN 'monthly' THEN 3 
			END
	`
	rows, err := h.db.QueryContext(r.Context(), query, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch budgets: "+err.Error())
		return
	}
	defer rows.Close()

	var cycleStartDay int = 1
	_ = h.db.QueryRowContext(r.Context(), `SELECT COALESCE(budget_cycle_start_day, 1) FROM users WHERE id = $1`, userID).Scan(&cycleStartDay)
	cycle := service.CalculateBudgetCycle(cycleStartDay, time.Now())

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

		// Calculate spent amount based on period
		var dateFilter string
		switch b.Period {
		case "daily":
			dateFilter = "transaction_date = CURRENT_DATE"
		case "weekly":
			dateFilter = "transaction_date >= date_trunc('week', CURRENT_DATE) AND transaction_date <= CURRENT_DATE"
		case "monthly":
			dateFilter = "transaction_date >= '" + cycle.StartDateStr + "'::date AND transaction_date <= CURRENT_DATE"
		}

		spendQuery := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = $1 AND type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL) AND (use_vault IS FALSE OR use_vault IS NULL) AND ` + dateFilter
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
	if req.Period != "daily" && req.Period != "weekly" && req.Period != "monthly" {
		respondError(w, http.StatusBadRequest, "Period must be 'daily', 'weekly', or 'monthly'")
		return
	}
	if req.AlertThresholdPercentage <= 0 || req.AlertThresholdPercentage > 100 {
		req.AlertThresholdPercentage = 80
	}

	if req.CategoryID == nil {
		var cycleStartDay int = 1
		_ = h.db.QueryRowContext(r.Context(), `SELECT COALESCE(budget_cycle_start_day, 1) FROM users WHERE id = $1`, userID).Scan(&cycleStartDay)
		cycle := service.CalculateBudgetCycle(cycleStartDay, time.Now())

		totalDays := float64(cycle.TotalDays)
		if totalDays <= 0 {
			totalDays = 30
		}

		var dailyTarget, weeklyTarget, monthlyTarget float64
		switch req.Period {
		case "monthly":
			dailyTarget = math.Round((req.TargetAmount / totalDays) * 100) / 100
			weeklyTarget = math.Round(dailyTarget * 7.0)
			monthlyTarget = req.TargetAmount
		case "daily":
			dailyTarget = req.TargetAmount
			weeklyTarget = math.Round(dailyTarget * 7.0)
			monthlyTarget = math.Round(dailyTarget * totalDays)
		case "weekly":
			dailyTarget = math.Round((req.TargetAmount / 7.0) * 100) / 100
			weeklyTarget = req.TargetAmount
			monthlyTarget = math.Round(dailyTarget * totalDays)
		}

		upsertQuery := `
			INSERT INTO budgets (user_id, category_id, period, target_amount, alert_threshold_percentage)
			VALUES ($1, NULL, $2, $3, $4)
			ON CONFLICT (user_id, category_id, period)
			DO UPDATE SET target_amount = EXCLUDED.target_amount, alert_threshold_percentage = EXCLUDED.alert_threshold_percentage, updated_at = CURRENT_TIMESTAMP
		`
		_, _ = h.db.ExecContext(r.Context(), upsertQuery, userID, "daily", dailyTarget, req.AlertThresholdPercentage)
		_, _ = h.db.ExecContext(r.Context(), upsertQuery, userID, "weekly", weeklyTarget, req.AlertThresholdPercentage)
		_, _ = h.db.ExecContext(r.Context(), upsertQuery, userID, "monthly", monthlyTarget, req.AlertThresholdPercentage)

		var b model.Budget
		_ = h.db.QueryRowContext(r.Context(), `
			SELECT id, user_id, category_id, period, target_amount, alert_threshold_percentage, created_at, updated_at
			FROM budgets
			WHERE user_id = $1 AND category_id IS NULL AND period = $2
		`, userID, req.Period).Scan(
			&b.ID, &b.UserID, &b.CategoryID, &b.Period, &b.TargetAmount, &b.AlertThresholdPercentage, &b.CreatedAt, &b.UpdatedAt,
		)
		respondJSON(w, http.StatusOK, b)
		return
	}

	query := `
		INSERT INTO budgets (user_id, category_id, period, target_amount, alert_threshold_percentage)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, category_id, period)
		DO UPDATE SET 
			target_amount = EXCLUDED.target_amount,
			alert_threshold_percentage = EXCLUDED.alert_threshold_percentage,
			updated_at = CURRENT_TIMESTAMP
		RETURNING id, user_id, category_id, period, target_amount, alert_threshold_percentage, created_at, updated_at
	`
	var b model.Budget
	err := h.db.QueryRowContext(
		r.Context(), query,
		userID, req.CategoryID, req.Period, req.TargetAmount, req.AlertThresholdPercentage,
	).Scan(
		&b.ID, &b.UserID, &b.CategoryID, &b.Period, &b.TargetAmount, &b.AlertThresholdPercentage,
		&b.CreatedAt, &b.UpdatedAt,
	)
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

	var isTotalSpending bool
	_ = h.db.QueryRowContext(r.Context(), `SELECT (category_id IS NULL) FROM budgets WHERE id = $1 AND user_id = $2`, budgetID, userID).Scan(&isTotalSpending)

	var res sql.Result
	if isTotalSpending {
		res, err = h.db.ExecContext(r.Context(), `DELETE FROM budgets WHERE user_id = $1 AND category_id IS NULL`, userID)
	} else {
		res, err = h.db.ExecContext(r.Context(), `DELETE FROM budgets WHERE id = $1 AND user_id = $2`, budgetID, userID)
	}
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

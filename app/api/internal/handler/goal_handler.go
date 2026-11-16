package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
)

type GoalHandler struct {
	db *sql.DB
}

func NewGoalHandler(db *sql.DB) *GoalHandler {
	return &GoalHandler{db: db}
}

type UpsertGoalRequest struct {
	Name          string  `json:"name"`
	TargetAmount  float64 `json:"target_amount"`
	CurrentAmount float64 `json:"current_amount"`
	TargetDate    *string `json:"target_date,omitempty"`
	Icon          string  `json:"icon"`
	Color         string  `json:"color"`
	Note          *string `json:"note,omitempty"`
}

type UpdateGoalProgressRequest struct {
	Mode   string  `json:"mode"`   // "add", "subtract", "set"
	Amount float64 `json:"amount"`
}

func computeGoalDerivedFields(g *model.SavingsGoal) {
	g.RemainingAmount = math.Max(0, g.TargetAmount-g.CurrentAmount)
	if g.TargetAmount > 0 {
		g.Percentage = (g.CurrentAmount / g.TargetAmount) * 100
	}
	g.IsCompleted = g.CurrentAmount >= g.TargetAmount
}

func scanSavingsGoal(scanner interface {
	Scan(dest ...interface{}) error
}) (model.SavingsGoal, error) {
	var g model.SavingsGoal
	var targetDate sql.NullTime
	var note sql.NullString

	err := scanner.Scan(
		&g.ID, &g.UserID, &g.Name, &g.TargetAmount, &g.CurrentAmount,
		&targetDate, &g.Icon, &g.Color, &note, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return g, err
	}

	if targetDate.Valid {
		formatted := targetDate.Time.Format("2006-01-02")
		g.TargetDate = &formatted
	}
	if note.Valid {
		g.Note = &note.String
	}
	computeGoalDerivedFields(&g)
	return g, nil
}

// FetchUserSavingsGoals returns all custom goals ordered with active goals first.
func FetchUserSavingsGoals(ctx context.Context, db *sql.DB, userID uuid.UUID) ([]model.SavingsGoal, error) {
	query := `
		SELECT id, user_id, name, target_amount, current_amount, target_date, icon, color, note, created_at, updated_at
		FROM savings_goals
		WHERE user_id = $1
		ORDER BY (current_amount >= target_amount) ASC, target_date ASC NULLS LAST, created_at DESC
	`
	rows, err := db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	goals := make([]model.SavingsGoal, 0)
	for rows.Next() {
		g, err := scanSavingsGoal(rows)
		if err != nil {
			return nil, err
		}
		goals = append(goals, g)
	}
	return goals, nil
}

func normalizeGoalDate(raw *string) (*string, error) {
	if raw == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil, nil
	}
	if _, err := time.Parse("2006-01-02", trimmed); err != nil {
		return nil, err
	}
	return &trimmed, nil
}

func normalizeOptionalNote(raw *string) *string {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func (h *GoalHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	goals, err := FetchUserSavingsGoals(r.Context(), h.db, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal mengambil daftar target anggaran")
		return
	}

	respondJSON(w, http.StatusOK, goals)
}

func (h *GoalHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req UpsertGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Nama target wajib diisi")
		return
	}
	if req.TargetAmount <= 0 {
		respondError(w, http.StatusBadRequest, "Nominal target harus lebih dari 0")
		return
	}
	if req.CurrentAmount < 0 {
		respondError(w, http.StatusBadRequest, "Dana terkumpul awal tidak boleh negatif")
		return
	}
	targetDate, err := normalizeGoalDate(req.TargetDate)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Format tanggal target tidak valid (YYYY-MM-DD)")
		return
	}
	if strings.TrimSpace(req.Icon) == "" {
		req.Icon = "target"
	}
	if strings.TrimSpace(req.Color) == "" {
		req.Color = "#10B981"
	}

	query := `
		INSERT INTO savings_goals (user_id, name, target_amount, current_amount, target_date, icon, color, note)
		VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8)
		RETURNING id, user_id, name, target_amount, current_amount, target_date, icon, color, note, created_at, updated_at
	`
	goal, err := scanSavingsGoal(h.db.QueryRowContext(
		r.Context(), query,
		userID, req.Name, req.TargetAmount, req.CurrentAmount, targetDate, req.Icon, req.Color, normalizeOptionalNote(req.Note),
	))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal membuat target anggaran")
		return
	}

	respondJSON(w, http.StatusCreated, goal)
}

func (h *GoalHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID target tidak valid")
		return
	}

	var req UpsertGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "Nama target wajib diisi")
		return
	}
	if req.TargetAmount <= 0 {
		respondError(w, http.StatusBadRequest, "Nominal target harus lebih dari 0")
		return
	}
	if req.CurrentAmount < 0 {
		respondError(w, http.StatusBadRequest, "Dana terkumpul tidak boleh negatif")
		return
	}
	targetDate, err := normalizeGoalDate(req.TargetDate)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Format tanggal target tidak valid (YYYY-MM-DD)")
		return
	}
	if strings.TrimSpace(req.Icon) == "" {
		req.Icon = "target"
	}
	if strings.TrimSpace(req.Color) == "" {
		req.Color = "#10B981"
	}

	query := `
		UPDATE savings_goals
		SET name = $1, target_amount = $2, current_amount = $3, target_date = $4::date,
		    icon = $5, color = $6, note = $7, updated_at = CURRENT_TIMESTAMP
		WHERE id = $8 AND user_id = $9
		RETURNING id, user_id, name, target_amount, current_amount, target_date, icon, color, note, created_at, updated_at
	`
	goal, err := scanSavingsGoal(h.db.QueryRowContext(
		r.Context(), query,
		req.Name, req.TargetAmount, req.CurrentAmount, targetDate,
		req.Icon, req.Color, normalizeOptionalNote(req.Note), goalID, userID,
	))
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Target anggaran tidak ditemukan")
		return
	} else if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal memperbarui target anggaran")
		return
	}

	respondJSON(w, http.StatusOK, goal)
}

func (h *GoalHandler) UpdateProgress(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID target tidak valid")
		return
	}

	var req UpdateGoalProgressRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Amount < 0 || (req.Mode != "set" && req.Amount <= 0) {
		respondError(w, http.StatusBadRequest, "Nominal progres tidak valid")
		return
	}

	var currentAmount float64
	err = h.db.QueryRowContext(r.Context(), `SELECT current_amount FROM savings_goals WHERE id = $1 AND user_id = $2`, goalID, userID).Scan(&currentAmount)
	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Target anggaran tidak ditemukan")
		return
	} else if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal memuat target anggaran")
		return
	}

	var nextAmount float64
	switch req.Mode {
	case "", "add":
		nextAmount = currentAmount + req.Amount
	case "subtract":
		if req.Amount > currentAmount {
			respondError(w, http.StatusBadRequest, "Nominal pengurangan melebihi dana yang sudah terkumpul")
			return
		}
		nextAmount = currentAmount - req.Amount
	case "set":
		nextAmount = req.Amount
	default:
		respondError(w, http.StatusBadRequest, "Mode progres harus 'add', 'subtract', atau 'set'")
		return
	}

	query := `
		UPDATE savings_goals
		SET current_amount = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND user_id = $3
		RETURNING id, user_id, name, target_amount, current_amount, target_date, icon, color, note, created_at, updated_at
	`
	goal, err := scanSavingsGoal(h.db.QueryRowContext(r.Context(), query, nextAmount, goalID, userID))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal memperbarui progres target")
		return
	}

	respondJSON(w, http.StatusOK, goal)
}

func (h *GoalHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	goalID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "ID target tidak valid")
		return
	}

	res, err := h.db.ExecContext(r.Context(), `DELETE FROM savings_goals WHERE id = $1 AND user_id = $2`, goalID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal menghapus target anggaran")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		respondError(w, http.StatusNotFound, "Target anggaran tidak ditemukan")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Target anggaran berhasil dihapus"})
}

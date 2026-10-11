package handler

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
)

type CategoryHandler struct {
	db *sql.DB
}

func NewCategoryHandler(db *sql.DB) *CategoryHandler {
	return &CategoryHandler{db: db}
}

type CreateCategoryRequest struct {
	Name  string `json:"name"`
	Code  string `json:"code,omitempty"`
	Type  string `json:"type"` // 'expense', 'income'
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	catType := r.URL.Query().Get("type")

	query := `
		SELECT id, user_id, name, code, type, icon, color, is_default, created_at, updated_at
		FROM categories
		WHERE (user_id = $1 OR user_id IS NULL)
	`
	args := []interface{}{userID}

	if catType != "" {
		query += " AND type = $2"
		args = append(args, catType)
	}

	query += " ORDER BY type ASC, name ASC"

	rows, err := h.db.QueryContext(r.Context(), query, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch categories")
		return
	}
	defer rows.Close()

	categories := make([]model.Category, 0)
	for rows.Next() {
		var c model.Category
		var code sql.NullString
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.Name, &code, &c.Type, &c.Icon, &c.Color,
			&c.IsDefault, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to parse category row: "+err.Error())
			return
		}
		if code.Valid {
			c.Code = &code.String
		}
		categories = append(categories, c)
	}

	respondJSON(w, http.StatusOK, categories)
}

func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" || (req.Type != "expense" && req.Type != "income") {
		respondError(w, http.StatusBadRequest, "Category name and valid type ('expense' or 'income') are required")
		return
	}
	if req.Icon == "" {
		req.Icon = "tag"
	}
	if req.Color == "" {
		req.Color = "#6B7280"
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		cleaned := strings.ReplaceAll(req.Name, " ", "")
		if len(cleaned) >= 2 {
			code = strings.ToUpper(cleaned[:2])
		} else {
			code = strings.ToUpper(req.Name)
		}
	}

	var cat model.Category
	var catCode sql.NullString
	query := `
		INSERT INTO categories (user_id, name, code, type, icon, color, is_default)
		VALUES ($1, $2, $3, $4, $5, $6, false)
		RETURNING id, user_id, name, code, type, icon, color, is_default, created_at, updated_at
	`
	err := h.db.QueryRowContext(r.Context(), query, userID, req.Name, code, req.Type, req.Icon, req.Color).Scan(
		&cat.ID, &cat.UserID, &cat.Name, &catCode, &cat.Type, &cat.Icon, &cat.Color,
		&cat.IsDefault, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create category: "+err.Error())
		return
	}
	if catCode.Valid {
		cat.Code = &catCode.String
	}

	respondJSON(w, http.StatusCreated, cat)
}

func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	catIDStr := chi.URLParam(r, "id")
	catID, err := uuid.Parse(catIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))

	var cat model.Category
	var catCode sql.NullString
	query := `
		UPDATE categories
		SET name = $1, code = COALESCE(NULLIF($2, ''), code), icon = $3, color = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5 AND user_id = $6
		RETURNING id, user_id, name, code, type, icon, color, is_default, created_at, updated_at
	`
	err = h.db.QueryRowContext(r.Context(), query, req.Name, code, req.Icon, req.Color, catID, userID).Scan(
		&cat.ID, &cat.UserID, &cat.Name, &catCode, &cat.Type, &cat.Icon, &cat.Color,
		&cat.IsDefault, &cat.CreatedAt, &cat.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update category or category is default template")
		return
	}
	if catCode.Valid {
		cat.Code = &catCode.String
	}

	respondJSON(w, http.StatusOK, cat)
}

func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	catIDStr := chi.URLParam(r, "id")
	catID, err := uuid.Parse(catIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "Invalid category ID")
		return
	}

	var count int
	_ = h.db.QueryRowContext(r.Context(), `SELECT COUNT(*) FROM transactions WHERE category_id = $1`, catID).Scan(&count)
	if count > 0 {
		respondError(w, http.StatusBadRequest, "Cannot delete category with existing transactions")
		return
	}

	query := `DELETE FROM categories WHERE id = $1 AND user_id = $2`
	res, err := h.db.ExecContext(r.Context(), query, catID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete category")
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		respondError(w, http.StatusNotFound, "Category not found or is system default template")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Category deleted successfully"})
}

package handler

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"golang.org/x/crypto/bcrypt"

	"finance-audit/api/internal/config"
	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
)

type AuthHandler struct {
	db  *sql.DB
	cfg *config.Config
}

func NewAuthHandler(db *sql.DB, cfg *config.Config) *AuthHandler {
	return &AuthHandler{db: db, cfg: cfg}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  *model.User `json:"user"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	respondError(w, http.StatusForbidden, "Pendaftaran akun publik saat ini dinonaktifkan. Silakan hubungi administrator atau login dengan akun terdaftar.")
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var user model.User
	var passwordHash string
	query := `
		SELECT id, email, password_hash, full_name, telegram_chat_id, app_mode, COALESCE(budget_cycle_start_day, 1), created_at, updated_at
		FROM users
		WHERE email = $1
	`
	err := h.db.QueryRowContext(r.Context(), query, req.Email).Scan(
		&user.ID, &user.Email, &passwordHash, &user.FullName, &user.TelegramChatID, &user.AppMode, &user.BudgetCycleStartDay, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			respondError(w, http.StatusUnauthorized, "Email atau password salah")
			return
		}
		log.Printf("[Auth] Login DB error: %v", err)
		respondError(w, http.StatusInternalServerError, "Terjadi kesalahan pada database saat login")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, h.cfg)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusOK, AuthResponse{
		Token: token,
		User:  &user,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var user model.User
	query := `
		SELECT id, email, full_name, telegram_chat_id, app_mode, COALESCE(budget_cycle_start_day, 1), created_at, updated_at
		FROM users
		WHERE id = $1
	`
	err := h.db.QueryRowContext(r.Context(), query, userID).Scan(
		&user.ID, &user.Email, &user.FullName, &user.TelegramChatID, &user.AppMode, &user.BudgetCycleStartDay, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusNotFound, "User not found")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateTelegram(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		TelegramChatID *int64 `json:"telegram_chat_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	query := `UPDATE users SET telegram_chat_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := h.db.ExecContext(r.Context(), query, req.TelegramChatID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update telegram chat id")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Telegram chat ID updated successfully"})
}

func (h *AuthHandler) UpdateAppMode(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		AppMode string `json:"app_mode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.AppMode != "basic" && req.AppMode != "audit" {
		respondError(w, http.StatusBadRequest, "App mode must be 'basic' or 'audit'")
		return
	}

	query := `UPDATE users SET app_mode = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := h.db.ExecContext(r.Context(), query, req.AppMode, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update app mode")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "App mode updated successfully",
		"app_mode": req.AppMode,
	})
}

func (h *AuthHandler) UpdateBudgetCycleStartDay(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		StartDay int `json:"start_day"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.StartDay < 1 || req.StartDay > 31 {
		respondError(w, http.StatusBadRequest, "Tanggal siklus anggaran harus antara 1 sampai 31")
		return
	}

	query := `UPDATE users SET budget_cycle_start_day = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`
	_, err := h.db.ExecContext(r.Context(), query, req.StartDay, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Gagal memperbarui tanggal siklus anggaran")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":                "Tanggal siklus anggaran berhasil diperbarui",
		"budget_cycle_start_day": req.StartDay,
	})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

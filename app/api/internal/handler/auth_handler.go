package handler

import (
	"database/sql"
	"encoding/json"
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
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" {
		respondError(w, http.StatusBadRequest, "Email, password, and full name are required")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	tx, err := h.db.BeginTx(r.Context(), nil)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database transaction error")
		return
	}
	defer tx.Rollback()

	// 1. Insert User
	var user model.User
	queryUser := `
		INSERT INTO users (email, password_hash, full_name)
		VALUES ($1, $2, $3)
		RETURNING id, email, full_name, telegram_chat_id, created_at, updated_at
	`
	err = tx.QueryRowContext(r.Context(), queryUser, req.Email, string(hash), req.FullName).Scan(
		&user.ID, &user.Email, &user.FullName, &user.TelegramChatID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusConflict, "Email already registered or database error")
		return
	}

	// 2. Create Default Wallet ("Dompet Utama")
	queryWallet := `
		INSERT INTO wallets (user_id, name, type, currency, initial_balance, current_balance, color, is_default)
		VALUES ($1, 'Dompet Utama', 'bank', 'IDR', 0, 0, '#10B981', true)
	`
	if _, err := tx.ExecContext(r.Context(), queryWallet, user.ID); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create default wallet")
		return
	}

	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, h.cfg)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusCreated, AuthResponse{
		Token: token,
		User:  &user,
	})
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
		SELECT id, email, password_hash, full_name, telegram_chat_id, created_at, updated_at
		FROM users
		WHERE email = $1
	`
	err := h.db.QueryRowContext(r.Context(), query, req.Email).Scan(
		&user.ID, &user.Email, &passwordHash, &user.FullName, &user.TelegramChatID, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
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
		SELECT id, email, full_name, telegram_chat_id, created_at, updated_at
		FROM users
		WHERE id = $1
	`
	err := h.db.QueryRowContext(r.Context(), query, userID).Scan(
		&user.ID, &user.Email, &user.FullName, &user.TelegramChatID, &user.CreatedAt, &user.UpdatedAt,
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

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

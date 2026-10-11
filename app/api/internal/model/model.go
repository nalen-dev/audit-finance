package model

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID             uuid.UUID  `json:"id"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"-"`
	FullName       string     `json:"full_name"`
	TelegramChatID *int64     `json:"telegram_chat_id,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type Wallet struct {
	ID             uuid.UUID `json:"id"`
	UserID         uuid.UUID `json:"user_id"`
	Name           string    `json:"name"`
	Type           string    `json:"type"` // 'bank', 'cash', 'ewallet', 'credit_card', 'investment', 'other'
	Currency       string    `json:"currency"`
	InitialBalance float64   `json:"initial_balance"`
	CurrentBalance float64   `json:"current_balance"`
	Color          string    `json:"color"`
	Icon           string    `json:"icon"`
	IsDefault      bool      `json:"is_default"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Category struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty"` // NULL for system default
	Name      string     `json:"name"`
	Code      *string    `json:"code,omitempty"`
	Type      string     `json:"type"` // 'expense', 'income'
	Icon      string     `json:"icon"`
	Color     string     `json:"color"`
	IsDefault bool       `json:"is_default"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type Transaction struct {
	ID                  uuid.UUID  `json:"id"`
	UserID              uuid.UUID  `json:"user_id"`
	WalletID            uuid.UUID  `json:"wallet_id"`
	CategoryID          *uuid.UUID `json:"category_id,omitempty"`
	DestinationWalletID *uuid.UUID `json:"destination_wallet_id,omitempty"`
	Amount              float64    `json:"amount"`
	Type                string     `json:"type"`        // 'expense', 'income', 'transfer'
	Source              string     `json:"source"`      // 'web', 'telegram', 'android'
	UseSavings          bool       `json:"use_savings"` // true jika diambil dari pos tabungan berjalan (darurat/tak terduga)
	UseVault            bool       `json:"use_vault"`   // true jika diambil dari tabungan aman / vault (barang mahal/aset)
	TransactionDate     string     `json:"transaction_date"` // YYYY-MM-DD
	TransactionTime     string     `json:"transaction_time"` // HH:MM:SS
	Note                *string    `json:"note,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at"`

	// Joined fields for convenience in responses
	WalletName    string `json:"wallet_name,omitempty"`
	CategoryName  string `json:"category_name,omitempty"`
	CategoryIcon  string `json:"category_icon,omitempty"`
	CategoryColor string `json:"category_color,omitempty"`
}

type Budget struct {
	ID                       uuid.UUID  `json:"id"`
	UserID                   uuid.UUID  `json:"user_id"`
	CategoryID               *uuid.UUID `json:"category_id,omitempty"` // NULL for total spending
	Period                   string     `json:"period"`                // 'daily', 'weekly', 'monthly'
	TargetAmount             float64    `json:"target_amount"`
	AlertThresholdPercentage int        `json:"alert_threshold_percentage"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`

	CategoryName    *string `json:"category_name,omitempty"`
	SpentAmount     float64 `json:"spent_amount"`
	RemainingAmount float64 `json:"remaining_amount"` // Target - Spent (sisa yang masih bisa digunakan)
	Percentage      float64 `json:"percentage"`
	IsWarning       bool    `json:"is_warning"`
	IsOverspent     bool    `json:"is_overspent"`
}

type DashboardSummary struct {
	TotalBalance       float64             `json:"total_balance"`
	MoneyToSpendToday  float64             `json:"money_to_spend_today"`  // Sisa jatah belanja hari ini
	MoneyToSpendMonth  float64             `json:"money_to_spend_month"`  // Sisa jatah belanja bulan ini
	MonthlySavingsPool float64             `json:"monthly_savings_pool"`  // Tabungan berjalan bulan ini (kelebihan harian yang dihemat)
	SafeVaultAmount    float64             `json:"safe_vault_amount"`     // Tabungan pokok aman (permanen)
	TodayExpense       float64             `json:"today_expense"`         // Pengeluaran belanja hari ini
	DailyTarget        float64             `json:"daily_target"`
	WeeklyTarget       float64             `json:"weekly_target"`
	MonthlyTarget      float64             `json:"monthly_target"`
	MonthlyIncome      float64             `json:"monthly_income"`
	MonthlyExpense     float64             `json:"monthly_expense"`
	SavedAmount        float64             `json:"saved_amount"` // Total akumulasi tabungan
	DailyBudget        *Budget             `json:"daily_budget,omitempty"`
	WeeklyBudget       *Budget             `json:"weekly_budget,omitempty"`
	MonthlyBudget      *Budget             `json:"monthly_budget,omitempty"`
	RecentTransactions []Transaction       `json:"recent_transactions"`
	Wallets            []Wallet            `json:"wallets"`
	OverspendingAlerts []OverspendingAlert `json:"overspending_alerts"`
}

type OverspendingAlert struct {
	Title       string  `json:"title"`
	Message     string  `json:"message"`
	Spent       float64 `json:"spent"`
	Target      float64 `json:"target"`
	Percentage  float64 `json:"percentage"`
	Period      string  `json:"period"`
}

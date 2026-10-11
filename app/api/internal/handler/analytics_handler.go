package handler

import (
	"database/sql"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"

	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/model"
)

type AnalyticsHandler struct {
	db *sql.DB
}

func NewAnalyticsHandler(db *sql.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

func (h *AnalyticsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	summary := model.DashboardSummary{
		Wallets:            make([]model.Wallet, 0),
		RecentTransactions: make([]model.Transaction, 0),
		OverspendingAlerts: make([]model.OverspendingAlert, 0),
	}

	// 1. Total Balance across all wallets
	_ = h.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(current_balance), 0) FROM wallets WHERE user_id = $1
	`, userID).Scan(&summary.TotalBalance)

	// 2. Today Regular Expense
	_ = h.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions 
		WHERE user_id = $1 
		  AND type = 'expense'
		  AND (use_savings IS FALSE OR use_savings IS NULL)
		  AND (use_vault IS FALSE OR use_vault IS NULL)
		  AND transaction_date = CURRENT_DATE
	`, userID).Scan(&summary.TodayExpense)

	// 3. Monthly Income & Regular Expense
	_ = h.db.QueryRowContext(r.Context(), `
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL) AND (use_vault IS FALSE OR use_vault IS NULL) THEN amount ELSE 0 END), 0)
		FROM transactions 
		WHERE user_id = $1 
		  AND transaction_date >= date_trunc('month', CURRENT_DATE)
		  AND transaction_date <= CURRENT_DATE
	`, userID).Scan(&summary.MonthlyIncome, &summary.MonthlyExpense)

	// 4. Budgets (Daily, Weekly, Monthly)
	budgets := h.getBudgetsWithSpent(userID)
	for i := range budgets {
		b := budgets[i]
		if b.CategoryID == nil { // Total spending budget
			switch b.Period {
			case "daily":
				summary.DailyBudget = &b
				summary.DailyTarget = b.TargetAmount
				summary.MoneyToSpendToday = b.RemainingAmount
			case "weekly":
				summary.WeeklyBudget = &b
				summary.WeeklyTarget = b.TargetAmount
			case "monthly":
				summary.MonthlyBudget = &b
				summary.MonthlyTarget = b.TargetAmount
				summary.MoneyToSpendMonth = b.RemainingAmount
			}
		}

		if b.IsWarning || b.IsOverspent {
			name := "Total Pengeluaran"
			if b.CategoryName != nil {
				name = *b.CategoryName
			}
			msg := fmt.Sprintf("Pengeluaran %s periode %s telah mencapai %.1f%% dari target.", name, b.Period, b.Percentage)
			if b.IsOverspent {
				msg = fmt.Sprintf("PERINGATAN OVERSPENDING: Pengeluaran %s periode %s telah melampaui target (%.1f%%)!", name, b.Period, b.Percentage)
			}
			summary.OverspendingAlerts = append(summary.OverspendingAlerts, model.OverspendingAlert{
				Title:      fmt.Sprintf("Alert %s (%s)", name, b.Period),
				Message:    msg,
				Spent:      b.SpentAmount,
				Target:     b.TargetAmount,
				Percentage: b.Percentage,
				Period:     b.Period,
			})
		}
	}

	// 5. Calculate Monthly Savings Pool and Safe Vault Amount
	// A. Find the budget's active start date in the current month
	// Only count completed days after the budget was established
	var pastDays int
	var startDate string
	_ = h.db.QueryRowContext(r.Context(), `
		SELECT 
			COALESCE(CURRENT_DATE - GREATEST(date_trunc('month', CURRENT_DATE)::date, MIN(created_at)::date), 0),
			COALESCE(GREATEST(date_trunc('month', CURRENT_DATE)::date, MIN(created_at)::date)::text, CURRENT_DATE::text)
		FROM budgets
		WHERE user_id = $1 AND category_id IS NULL
	`, userID).Scan(&pastDays, &startDate)

	if pastDays < 0 {
		pastDays = 0
	}

	// B. Query past completed days regular expenses (since budget active start date, up to yesterday)
	var pastRegularExpense float64
	if pastDays > 0 {
		_ = h.db.QueryRowContext(r.Context(), `
			SELECT COALESCE(SUM(amount), 0)
			FROM transactions
			WHERE user_id = $1
			  AND type = 'expense'
			  AND (use_savings IS FALSE OR use_savings IS NULL)
			  AND (use_vault IS FALSE OR use_vault IS NULL)
			  AND transaction_date >= $2::date
			  AND transaction_date < CURRENT_DATE
		`, userID, startDate).Scan(&pastRegularExpense)
	}

	// C. Query emergency expenses this month (use_savings = true and not vault)
	var monthlyEmergencyExpense float64
	_ = h.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE user_id = $1
		  AND type = 'expense'
		  AND use_savings IS TRUE
		  AND (use_vault IS FALSE OR use_vault IS NULL)
		  AND transaction_date >= date_trunc('month', CURRENT_DATE)
		  AND transaction_date <= CURRENT_DATE
	`, userID).Scan(&monthlyEmergencyExpense)

	var accumulatedDailySurplus float64
	if summary.DailyTarget > 0 && pastDays > 0 {
		accumulatedDailySurplus = math.Max(0, (float64(pastDays)*summary.DailyTarget)-pastRegularExpense)
	}

	// Tabungan Berjalan Bulan Ini: akumulasi hemat harian yang telah lewat - pengeluaran darurat
	// Bisa bernilai negatif jika pengeluaran darurat melebihi saldo tabungan berjalan (defisit pos tabungan)
	summary.MonthlySavingsPool = accumulatedDailySurplus - monthlyEmergencyExpense

	// Sisa alokasi belanja bulan ini (Target Bulanan - Pengeluaran Belanja Bulan Ini)
	remainingBudgetMonth := math.Max(0, summary.MonthlyTarget-summary.MonthlyExpense)

	// Sisa kuota belanja yang masih bisa digunakan bulan ini:
	// Jika tabungan berjalan positif (sudah ada sisa hari yang terkunci), kurangi dari pagu belanja sisa agar tidak terhitung ganda.
	// Jika tabungan berjalan 0 atau minus, sisa kuota belanja bulanan tetap utuh (tidak dipotong pengeluaran darurat).
	if summary.MonthlySavingsPool > 0 {
		summary.MoneyToSpendMonth = math.Max(0, remainingBudgetMonth-summary.MonthlySavingsPool)
	} else {
		summary.MoneyToSpendMonth = remainingBudgetMonth
	}

	// Tabungan Aman (Vault):
	// Uang cadangan permanen di luar alokasi belanja dan tabungan berjalan.
	// Dihitung sebagai Total Saldo Riil - (Sisa Kuota Belanja Bulan Ini + Tabungan Berjalan).
	if summary.MonthlyTarget > 0 {
		summary.SafeVaultAmount = math.Max(0, summary.TotalBalance-(summary.MoneyToSpendMonth+summary.MonthlySavingsPool))
		summary.SavedAmount = summary.SafeVaultAmount + summary.MonthlySavingsPool
	} else {
		summary.SafeVaultAmount = summary.TotalBalance
		summary.SavedAmount = summary.TotalBalance
	}

	// 6. Wallets list
	wRows, err := h.db.QueryContext(r.Context(), `
		SELECT id, user_id, name, type, currency, initial_balance, current_balance, color, icon, is_default, created_at, updated_at
		FROM wallets WHERE user_id = $1 ORDER BY is_default DESC, name ASC
	`, userID)
	if err == nil {
		defer wRows.Close()
		for wRows.Next() {
			var item model.Wallet
			_ = wRows.Scan(
				&item.ID, &item.UserID, &item.Name, &item.Type, &item.Currency,
				&item.InitialBalance, &item.CurrentBalance, &item.Color, &item.Icon,
				&item.IsDefault, &item.CreatedAt, &item.UpdatedAt,
			)
			summary.Wallets = append(summary.Wallets, item)
		}
	}

	// 7. Recent Transactions
	txRows, err := h.db.QueryContext(r.Context(), `
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
		WHERE t.user_id = $1
		ORDER BY t.transaction_date DESC, t.transaction_time DESC, t.created_at DESC
		LIMIT 6
	`, userID)
	if err == nil {
		defer txRows.Close()
		for txRows.Next() {
			var t model.Transaction
			var catID sql.NullString
			var note sql.NullString
			var destWallet sql.NullString
			var tDate time.Time
			var tTime string
			if err := txRows.Scan(
				&t.ID, &t.UserID, &t.WalletID, &catID, &destWallet,
				&t.Amount, &t.Type, &t.Source, &t.UseSavings, &t.UseVault, &tDate, &tTime, &note,
				&t.CreatedAt, &t.UpdatedAt,
				&t.WalletName, &t.CategoryName, &t.CategoryIcon, &t.CategoryColor,
			); err == nil {
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
				summary.RecentTransactions = append(summary.RecentTransactions, t)
			}
		}
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *AnalyticsHandler) getBudgetsWithSpent(userID uuid.UUID) []model.Budget {
	query := `
		SELECT 
			b.id, b.user_id, b.category_id, b.period, b.target_amount, b.alert_threshold_percentage,
			b.created_at, b.updated_at,
			c.name as category_name
		FROM budgets b
		LEFT JOIN categories c ON b.category_id = c.id
		WHERE b.user_id = $1
	`
	rows, err := h.db.Query(query, userID)
	if err != nil {
		return nil
	}
	defer rows.Close()

	budgets := make([]model.Budget, 0)
	for rows.Next() {
		var b model.Budget
		var catName sql.NullString
		_ = rows.Scan(
			&b.ID, &b.UserID, &b.CategoryID, &b.Period, &b.TargetAmount, &b.AlertThresholdPercentage,
			&b.CreatedAt, &b.UpdatedAt, &catName,
		)
		if catName.Valid {
			b.CategoryName = &catName.String
		}

		var dateFilter string
		switch b.Period {
		case "daily":
			dateFilter = "transaction_date = CURRENT_DATE"
		case "weekly":
			dateFilter = "transaction_date >= date_trunc('week', CURRENT_DATE) AND transaction_date <= CURRENT_DATE"
		case "monthly":
			dateFilter = "transaction_date >= date_trunc('month', CURRENT_DATE) AND transaction_date <= CURRENT_DATE"
		}

		spendQuery := `SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = $1 AND type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL) AND (use_vault IS FALSE OR use_vault IS NULL) AND ` + dateFilter
		spendArgs := []interface{}{userID}

		if b.CategoryID != nil {
			spendQuery += " AND category_id = $2"
			spendArgs = append(spendArgs, *b.CategoryID)
		}

		_ = h.db.QueryRow(spendQuery, spendArgs...).Scan(&b.SpentAmount)

		b.RemainingAmount = b.TargetAmount - b.SpentAmount

		if b.TargetAmount > 0 {
			b.Percentage = (b.SpentAmount / b.TargetAmount) * 100
		}
		b.IsWarning = b.Percentage >= float64(b.AlertThresholdPercentage)
		b.IsOverspent = b.Percentage >= 100.0

		budgets = append(budgets, b)
	}

	return budgets
}

package telegram

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Bot struct {
	token      string
	db         *sql.DB
	client     *http.Client
	stopChan   chan struct{}
	wg         sync.WaitGroup
	isRunning  bool
	mutex      sync.Mutex
}

type Update struct {
	UpdateID int      `json:"update_id"`
	Message  *Message `json:"message"`
}

type Message struct {
	MessageID int    `json:"message_id"`
	From      *User  `json:"from"`
	Chat      Chat   `json:"chat"`
	Text      string `json:"text"`
	Date      int64  `json:"date"`
}

type User struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	Username  string `json:"username"`
}

type Chat struct {
	ID   int64  `json:"id"`
	Type string `json:"type"`
}

type SendMessageRequest struct {
	ChatID    int64  `json:"chat_id"`
	Text      string `json:"text"`
	ParseMode string `json:"parse_mode,omitempty"`
}

func NewBot(token string, db *sql.DB) *Bot {
	return &Bot{
		token:    token,
		db:       db,
		client:   &http.Client{Timeout: 40 * time.Second},
		stopChan: make(chan struct{}),
	}
}

func (b *Bot) Start() {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.token == "" {
		log.Println("[Telegram Bot] Token is empty (TELEGRAM_BOT_TOKEN not configured). Bot worker is standby.")
		return
	}

	if b.isRunning {
		return
	}

	b.isRunning = true
	b.wg.Add(1)
	go b.pollUpdates()
	log.Println("[Telegram Bot] Bot polling service started successfully.")
}

func (b *Bot) Stop() {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if !b.isRunning {
		return
	}

	close(b.stopChan)
	b.wg.Wait()
	b.isRunning = false
	log.Println("[Telegram Bot] Bot polling service stopped.")
}

func (b *Bot) pollUpdates() {
	defer b.wg.Done()

	offset := 0
	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s", b.token)

	for {
		select {
		case <-b.stopChan:
			return
		default:
		}

		reqURL := fmt.Sprintf("%s/getUpdates?offset=%d&timeout=25", apiURL, offset)
		req, err := http.NewRequest(http.MethodGet, reqURL, nil)
		if err != nil {
			time.Sleep(2 * time.Second)
			continue
		}

		resp, err := b.client.Do(req)
		if err != nil {
			// Network error or timeout, backoff slightly
			time.Sleep(3 * time.Second)
			continue
		}

		var result struct {
			Ok     bool     `json:"ok"`
			Result []Update `json:"result"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			resp.Body.Close()
			time.Sleep(2 * time.Second)
			continue
		}
		resp.Body.Close()

		if !result.Ok {
			time.Sleep(3 * time.Second)
			continue
		}

		for _, update := range result.Result {
			if update.UpdateID >= offset {
				offset = update.UpdateID + 1
			}

			if update.Message != nil && update.Message.Text != "" {
				b.handleMessage(update.Message)
			}
		}
	}
}

func (b *Bot) SendMessage(chatID int64, text string) {
	if b.token == "" {
		return
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", b.token)
	payload := SendMessageRequest{
		ChatID:    chatID,
		Text:      text,
		ParseMode: "Markdown",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return
	}

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(body))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := b.client.Do(req)
	if err == nil {
		resp.Body.Close()
	}
}

func (b *Bot) handleMessage(msg *Message) {
	text := strings.TrimSpace(msg.Text)
	chatID := msg.Chat.ID

	// 1. Command /start
	if strings.HasPrefix(text, "/start") {
		b.handleStart(chatID)
		return
	}

	// 2. Command /help
	if strings.HasPrefix(text, "/help") {
		b.handleHelp(chatID)
		return
	}

	// 3. Command /link <email>
	if strings.HasPrefix(text, "/link") {
		b.handleLink(chatID, text)
		return
	}

	// 4. Command /saldo or /status
	if strings.HasPrefix(text, "/saldo") || strings.HasPrefix(text, "/status") {
		b.handleStatus(chatID)
		return
	}

	// 5. Normal Transaction parsing
	b.handleTransaction(chatID, text)
}

func (b *Bot) handleStart(chatID int64) {
	msg := fmt.Sprintf(`👋 *Halo! Selamat datang di OripioFin Bot*

Bot ini memudahkan Anda mencatat pengeluaran harian dan memantau *Money to Spend* secara real-time.

🆔 *ID Telegram Anda:* `+"`%d`"+`

*Langkah Awal:*
Hubungkan bot ini dengan akun web Anda dengan mengetik:
`+"`/link email_anda@example.com`"+`

Atau buka aplikasi Web OripioFin dan masukkan ID Telegram di atas pada halaman profil.

Ketik /help untuk melihat format pencatatan transaksi.`, chatID)

	b.SendMessage(chatID, msg)
}

func (b *Bot) handleHelp(chatID int64) {
	msg := `📖 *Panduan Penggunaan OripioFin Bot*

⚡ *1. Format Cepat (Kode Kategori 2 Huruf):*
• ` + "`25k mk -o nasi padang`" + `
• ` + "`50k tr bca -o bensin shell`" + `
• ` + "`1.5jt bl bca -v -o beli monitor`" + `
• ` + "`120k ks -d -o obat apotek`" + `

🏷 *Kode Kategori Utama (2 Karakter):*
• *MK* = Makanan & Minuman
• *TR* = Transportasi
• *BL* = Belanja & Kebutuhan
• *TG* = Tagihan & Utilitas
• *HB* = Hiburan & Rekreasi
• *KS* = Kesehatan & Medis
• *PD* = Pendidikan & Buku
• *LL* = Lain-lain
• *GJ* = Gaji Utama | *FL* = Freelance

🚩 *Flag Tambahan (Opsional):*
• ` + "`-o <teks>`" + ` atau ` + "`--o`" + ` : Catatan / keterangan transaksi
• ` + "`-w <dompet>`" + ` : Pilih dompet / rekening (misal: -w bca)
• ` + "`-v`" + ` atau ` + "`--vault`" + ` : Sumber Tabungan Aman (barang mahal)
• ` + "`-d`" + ` atau ` + "`--darurat`" + ` : Sumber Pos Darurat (tabungan berjalan)

💬 *2. Format Natural (Ketik Bebas):*
• ` + "`25000 Makan siang bca`" + `
• ` + "`35k Bensin`" + `
• ` + "`/vault 4000000 Beli laptop bca`" + `
• ` + "`/darurat 150k Tambal ban`" + `
• ` + "`+5000000 Gaji bulanan bca`" + `

📊 *3. Cek Status Keuangan:*
• ` + "`/saldo`" + ` atau ` + "`/status`" + `

🔗 *4. Hubungkan Akun:*
• ` + "`/link email_anda@example.com`"

	b.SendMessage(chatID, msg)
}

func (b *Bot) handleLink(chatID int64, text string) {
	parts := strings.Fields(text)
	if len(parts) < 2 {
		b.SendMessage(chatID, "⚠️ Format salah. Ketik: `/link email_anda@example.com`")
		return
	}

	email := strings.ToLower(strings.TrimSpace(parts[1]))

	var userID uuid.UUID
	var fullName string
	err := b.db.QueryRow(`SELECT id, full_name FROM users WHERE LOWER(email) = $1`, email).Scan(&userID, &fullName)
	if err != nil {
		b.SendMessage(chatID, fmt.Sprintf("❌ Akun dengan email `%s` tidak ditemukan di OripioFin.\nPastikan Anda sudah mendaftar di web terlebih dahulu.", email))
		return
	}

	_, err = b.db.Exec(`UPDATE users SET telegram_chat_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, chatID, userID)
	if err != nil {
		b.SendMessage(chatID, "❌ Gagal menghubungkan akun. Silakan coba lagi nanti.")
		return
	}

	b.SendMessage(chatID, fmt.Sprintf("✅ *Akun Berhasil Terhubung!*\n\nHalo *%s*, akun Anda sudah aktif disinkronkan dengan bot.\nSekarang Anda bisa langsung mengetik pengeluaran, misal:\n`25000 Makan siang`", fullName))
}

func (b *Bot) handleStatus(chatID int64) {
	userID, err := b.getUserIDByChat(chatID)
	if err != nil {
		b.SendMessage(chatID, "⚠️ Akun Telegram Anda belum terhubung ke OripioFin.\nKetik: `/link email_anda@example.com` untuk menghubungkan.")
		return
	}

	// 1. Total balance
	var totalBalance float64
	_ = b.db.QueryRow(`SELECT COALESCE(SUM(current_balance), 0) FROM wallets WHERE user_id = $1`, userID).Scan(&totalBalance)

	// 2. Today regular expense
	var todayExpense float64
	_ = b.db.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE user_id = $1 AND type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL) AND transaction_date = CURRENT_DATE
	`, userID).Scan(&todayExpense)

	// 3. Targets (Daily & Monthly)
	var dailyTarget, monthlyTarget float64
	_ = b.db.QueryRow(`
		SELECT target_amount FROM budgets WHERE user_id = $1 AND category_id IS NULL AND period = 'daily'
	`, userID).Scan(&dailyTarget)
	_ = b.db.QueryRow(`
		SELECT target_amount FROM budgets WHERE user_id = $1 AND category_id IS NULL AND period = 'monthly'
	`, userID).Scan(&monthlyTarget)

	// 4. Monthly Regular Expense
	var monthlyExpense float64
	_ = b.db.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE user_id = $1 AND type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL)
		  AND transaction_date >= date_trunc('month', CURRENT_DATE) AND transaction_date <= CURRENT_DATE
	`, userID).Scan(&monthlyExpense)

	// 5. Monthly savings pool & completed days
	var pastDays int
	var startDate string
	_ = b.db.QueryRow(`
		SELECT 
			COALESCE(CURRENT_DATE - GREATEST(date_trunc('month', CURRENT_DATE)::date, MIN(created_at)::date), 0),
			COALESCE(GREATEST(date_trunc('month', CURRENT_DATE)::date, MIN(created_at)::date)::text, CURRENT_DATE::text)
		FROM budgets
		WHERE user_id = $1 AND category_id IS NULL
	`, userID).Scan(&pastDays, &startDate)

	if pastDays < 0 {
		pastDays = 0
	}

	var pastRegularExpense float64
	if pastDays > 0 {
		_ = b.db.QueryRow(`
			SELECT COALESCE(SUM(amount), 0)
			FROM transactions
			WHERE user_id = $1 AND type = 'expense' AND (use_savings IS FALSE OR use_savings IS NULL)
			  AND transaction_date >= $2::date AND transaction_date < CURRENT_DATE
		`, userID, startDate).Scan(&pastRegularExpense)
	}

	var monthlyEmergency float64
	_ = b.db.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE user_id = $1 AND type = 'expense' AND use_savings IS TRUE
		  AND transaction_date >= date_trunc('month', CURRENT_DATE) AND transaction_date <= CURRENT_DATE
	`, userID).Scan(&monthlyEmergency)

	var accumulatedDailySurplus float64
	if dailyTarget > 0 && pastDays > 0 {
		accumulatedDailySurplus = math.Max(0, (float64(pastDays)*dailyTarget)-pastRegularExpense)
	}

	savingsPool := accumulatedDailySurplus - monthlyEmergency
	remainingBudgetMonth := math.Max(0, monthlyTarget-monthlyExpense)

	var moneyToSpendMonth float64
	if savingsPool > 0 {
		moneyToSpendMonth = math.Max(0, remainingBudgetMonth-savingsPool)
	} else {
		moneyToSpendMonth = remainingBudgetMonth
	}

	var safeVault float64
	if monthlyTarget > 0 {
		safeVault = math.Max(0, totalBalance-(moneyToSpendMonth+savingsPool))
	} else {
		safeVault = totalBalance
	}

	moneyToSpendToday := dailyTarget - todayExpense

	msg := fmt.Sprintf(`📊 *Ringkasan Keuangan OripioFin*

💳 *Total Saldo Riil:* Rp %s
🎯 *Target Harian:* Rp %s
💸 *Pengeluaran Hari Ini:* Rp %s

✨ *Money to Spend Hari Ini:* Rp %s
📅 *Sisa Kuota Bulan Ini:* Rp %s
🐖 *Tabungan Berjalan (Bulan Ini):* Rp %s
🛡 *Tabungan Aman / Vault:* Rp %s`,
		formatIDR(totalBalance),
		formatIDR(dailyTarget),
		formatIDR(todayExpense),
		formatIDR(moneyToSpendToday),
		formatIDR(moneyToSpendMonth),
		formatIDR(savingsPool),
		formatIDR(safeVault),
	)

	b.SendMessage(chatID, msg)
}

func (b *Bot) handleTransaction(chatID int64, text string) {
	userID, err := b.getUserIDByChat(chatID)
	if err != nil {
		b.SendMessage(chatID, "⚠️ Akun Telegram Anda belum terhubung ke OripioFin.\nKetik: `/link email_anda@example.com` untuk menghubungkan akun.")
		return
	}

	isSavings := false
	isVault := false
	isIncome := false

	// Check income prefix
	lowerText := strings.ToLower(text)
	if strings.HasPrefix(lowerText, "/masuk") {
		isIncome = true
		if idx := strings.Index(text, " "); idx != -1 {
			text = strings.TrimSpace(text[idx:])
		}
	} else if strings.HasPrefix(text, "+") {
		isIncome = true
		text = strings.TrimPrefix(text, "+")
	}

	// Check command prefixes
	lowerText = strings.ToLower(text)
	if strings.HasPrefix(lowerText, "/vault") || strings.HasPrefix(lowerText, "/aman") {
		isVault = true
		if idx := strings.Index(text, " "); idx != -1 {
			text = strings.TrimSpace(text[idx:])
		}
	} else if strings.HasPrefix(lowerText, "/darurat") || strings.HasPrefix(lowerText, "/tabungan") {
		isSavings = true
		if idx := strings.Index(text, " "); idx != -1 {
			text = strings.TrimSpace(text[idx:])
		}
	}

	// Extract optional explicit note flag: -o, --o, -n, --note
	var explicitNote string
	noteFlags := []string{" -o ", " --o ", " -n ", " --note "}
	for _, flag := range noteFlags {
		if idx := strings.Index(strings.ToLower(text), flag); idx != -1 {
			explicitNote = strings.TrimSpace(text[idx+len(flag):])
			text = strings.TrimSpace(text[:idx])
			break
		}
	}

	// Check flags within text: -v, --vault, -a, --aman, -d, --darurat, -p, --pos, -w, --wallet
	words := strings.Fields(text)
	var filteredWords []string
	var explicitWallet string

	for i := 0; i < len(words); i++ {
		w := strings.ToLower(words[i])
		if w == "-v" || w == "--vault" || w == "-a" || w == "--aman" || w == "#vault" || w == "#aman" {
			isVault = true
		} else if w == "-d" || w == "--darurat" || w == "-p" || w == "--pos" || w == "--tabungan" || w == "#darurat" || w == "#tabungan" {
			isSavings = true
		} else if (w == "-w" || w == "--wallet") && i+1 < len(words) {
			explicitWallet = words[i+1]
			i++
		} else {
			filteredWords = append(filteredWords, words[i])
		}
	}

	cleanedText := strings.Join(filteredWords, " ")
	amount, note, err := parseAmountAndNote(cleanedText)
	if err != nil || amount <= 0 {
		b.SendMessage(chatID, "⚠️ Format transaksi tidak dikenali.\nContoh: `25k mk -o makan siang` atau `50k bensin bca`.\nKetik /help untuk panduan lengkap.")
		return
	}

	if explicitWallet != "" {
		note = explicitWallet + " " + note
	}

	// Find wallet
	walletID, walletName, walletBal, err := b.matchWallet(userID, &note)
	if err != nil {
		b.SendMessage(chatID, "❌ Anda belum memiliki dompet/rekening. Silakan buat dompet terlebih dahulu di web.")
		return
	}

	// Find category
	txType := "expense"
	if isIncome {
		txType = "income"
	}
	catID, catName, _ := b.matchCategory(userID, txType, &note)

	// Extract clean note
	var noteToSave *string
	displayNote := "-"
	if explicitNote != "" {
		noteToSave = &explicitNote
		displayNote = explicitNote
	} else if strings.TrimSpace(note) != "" && !strings.EqualFold(strings.TrimSpace(note), catName) {
		clean := strings.TrimSpace(note)
		noteToSave = &clean
		displayNote = clean
	}

	// Save transaction in DB
	tx, err := b.db.Begin()
	if err != nil {
		b.SendMessage(chatID, "❌ Gagal memproses transaksi (database error).")
		return
	}
	defer tx.Rollback()

	var newTxID uuid.UUID
	err = tx.QueryRow(`
		INSERT INTO transactions (
			user_id, wallet_id, category_id, amount, type, source, use_savings, use_vault,
			transaction_date, transaction_time, note
		) VALUES (
			$1, $2, $3, $4, $5, 'telegram', $6, $7, CURRENT_DATE, CURRENT_TIME, $8
		) RETURNING id
	`, userID, walletID, catID, amount, txType, isSavings, isVault, noteToSave).Scan(&newTxID)
	if err != nil {
		b.SendMessage(chatID, "❌ Gagal mencatat transaksi: "+err.Error())
		return
	}

	// Update balance
	var newBal float64
	if txType == "expense" {
		newBal = walletBal - amount
		_, err = tx.Exec(`UPDATE wallets SET current_balance = current_balance - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, amount, walletID)
	} else {
		newBal = walletBal + amount
		_, err = tx.Exec(`UPDATE wallets SET current_balance = current_balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, amount, walletID)
	}

	if err != nil {
		b.SendMessage(chatID, "❌ Gagal mengupdate saldo rekening.")
		return
	}

	if err := tx.Commit(); err != nil {
		b.SendMessage(chatID, "❌ Gagal menyimpan transaksi.")
		return
	}

	// Calculate current Daily remaining
	var dailyTarget, todayExpense float64
	_ = b.db.QueryRow(`
		SELECT target_amount FROM budgets WHERE user_id = $1 AND category_id IS NULL AND period = 'daily'
	`, userID).Scan(&dailyTarget)

	_ = b.db.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE user_id = $1 AND type = 'expense' 
		  AND (use_savings IS FALSE OR use_savings IS NULL) 
		  AND (use_vault IS FALSE OR use_vault IS NULL)
		  AND transaction_date = CURRENT_DATE
	`, userID).Scan(&todayExpense)

	moneyToSpendToday := dailyTarget - todayExpense

	var reply string
	if isIncome {
		reply = fmt.Sprintf(`✅ *Pemasukan Berhasil Dicatat!*
💵 Nominal: *Rp %s*
🏷 Kategori: *%s*
💳 Rekening: *%s* (Saldo: Rp %s)
📝 Catatan: %s`,
			formatIDR(amount),
			catName,
			walletName,
			formatIDR(newBal),
			displayNote,
		)
	} else if isVault {
		reply = fmt.Sprintf(`✅ *Pengeluaran Tabungan Aman (Vault) Dicatat!*
🛡 *Menggunakan Dana Tabungan Pokok*
💸 Nominal: *Rp %s*
🏷 Kategori: *%s*
💳 Rekening: *%s* (Saldo: Rp %s)
📝 Catatan: %s

_Catatan: Tidak mengurangi jatah belanja harian maupun tabungan berjalan._`,
			formatIDR(amount),
			catName,
			walletName,
			formatIDR(newBal),
			displayNote,
		)
	} else if isSavings {
		reply = fmt.Sprintf(`✅ *Pengeluaran Darurat Dicatat!*
⚠️ *Menggunakan Pos Tabungan*
💸 Nominal: *Rp %s*
🏷 Kategori: *%s*
💳 Rekening: *%s* (Saldo: Rp %s)
📝 Catatan: %s

_Catatan: Tidak memotong jatah Money to Spend harian Anda._`,
			formatIDR(amount),
			catName,
			walletName,
			formatIDR(newBal),
			displayNote,
		)
	} else {
		remainingStr := fmt.Sprintf("Rp %s", formatIDR(moneyToSpendToday))
		if dailyTarget > 0 && moneyToSpendToday < 0 {
			remainingStr = fmt.Sprintf("⚠️ Overspent (-Rp %s)", formatIDR(math.Abs(moneyToSpendToday)))
		}

		reply = fmt.Sprintf(`✅ *Pengeluaran Berhasil Dicatat!*
💸 Nominal: *Rp %s*
🏷 Kategori: *%s*
💳 Rekening: *%s* (Saldo: Rp %s)
📝 Catatan: %s

🎯 *Money to Spend Hari Ini:* %s
_(Target: Rp %s • Terpakai: Rp %s)_`,
			formatIDR(amount),
			catName,
			walletName,
			formatIDR(newBal),
			displayNote,
			remainingStr,
			formatIDR(dailyTarget),
			formatIDR(todayExpense),
		)
	}

	b.SendMessage(chatID, reply)
}

func (b *Bot) getUserIDByChat(chatID int64) (uuid.UUID, error) {
	var uid uuid.UUID
	err := b.db.QueryRow(`SELECT id FROM users WHERE telegram_chat_id = $1`, chatID).Scan(&uid)
	return uid, err
}

func (b *Bot) matchWallet(userID uuid.UUID, note *string) (uuid.UUID, string, float64, error) {
	rows, err := b.db.Query(`SELECT id, name, current_balance, is_default FROM wallets WHERE user_id = $1 ORDER BY is_default DESC`, userID)
	if err != nil {
		return uuid.Nil, "", 0, err
	}
	defer rows.Close()

	type wInfo struct {
		id      uuid.UUID
		name    string
		balance float64
		isDef   bool
	}

	var wallets []wInfo
	for rows.Next() {
		var w wInfo
		if err := rows.Scan(&w.id, &w.name, &w.balance, &w.isDef); err == nil {
			wallets = append(wallets, w)
		}
	}

	if len(wallets) == 0 {
		return uuid.Nil, "", 0, fmt.Errorf("no wallets found")
	}

	lowerNote := strings.ToLower(*note)

	// Check if note mentions any wallet name
	for _, w := range wallets {
		wLower := strings.ToLower(w.name)
		pattern := `\b` + regexp.QuoteMeta(wLower) + `\b`
		re := regexp.MustCompile(pattern)
		if re.MatchString(lowerNote) {
			// Strip wallet name from note
			cleaned := re.ReplaceAllString(lowerNote, "")
			*note = strings.TrimSpace(cleaned)
			return w.id, w.name, w.balance, nil
		}
	}

	// Default to first/is_default wallet
	return wallets[0].id, wallets[0].name, wallets[0].balance, nil
}

func (b *Bot) matchCategory(userID uuid.UUID, txType string, note *string) (uuid.UUID, string, error) {
	rows, err := b.db.Query(`
		SELECT id, name, COALESCE(code, '') FROM categories 
		WHERE (user_id = $1 OR user_id IS NULL) AND type = $2
		ORDER BY is_default ASC
	`, userID, txType)
	if err != nil {
		return uuid.Nil, "", err
	}
	defer rows.Close()

	type catInfo struct {
		id   uuid.UUID
		name string
		code string
	}
	var categories []catInfo
	for rows.Next() {
		var c catInfo
		if err := rows.Scan(&c.id, &c.name, &c.code); err == nil {
			categories = append(categories, c)
		}
	}

	if len(categories) == 0 {
		return uuid.Nil, "", fmt.Errorf("no categories")
	}

	lowerNote := strings.ToLower(*note)
	words := strings.Fields(lowerNote)

	// 1. First priority: Check exact match with category 2-character code (e.g., 'mk', 'tr', 'bl')
	for _, cat := range categories {
		if cat.code == "" {
			continue
		}
		cCode := strings.ToLower(cat.code)
		for _, w := range words {
			if w == cCode {
				// Strip code word from note
				re := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(cCode) + `\b`)
				cleaned := re.ReplaceAllString(*note, "")
				*note = strings.TrimSpace(cleaned)
				return cat.id, cat.name, nil
			}
		}
	}

	// 2. Second priority: Keyword mapping heuristics
	keywordMap := map[string][]string{
		"makanan":    {"makan", "minum", "kopi", "cafe", "resto", "sarapan", "dinner", "lunch", "snack", "bakso", "mie", "nasi"},
		"transport":  {"bensin", "pertalite", "pertamax", "parkir", "ojol", "gojek", "grab", "maxim", "tol", "toll", "cuci motor"},
		"belanja":    {"belanja", "indomaret", "alfamart", "supermarket", "shopee", "tokopedia", "baju", "sepatu"},
		"tagihan":    {"listrik", "pln", "wifi", "indihome", "pulsa", "kuota", "air", "pdam", "iuran"},
		"hiburan":    {"nonton", "bioskop", "cinema", "game", "steam", "netflix", "spotify", "liburan"},
		"kesehatan":  {"obat", "dokter", "apotek", "klinik", "rs", "vitamin", "rapid"},
		"pendidikan": {"buku", "kursus", "kuliah", "sekolah", "udemy"},
		"gaji":       {"gaji", "salary", "upah"},
		"freelance":  {"proyek", "project", "side job", "klien"},
	}

	for _, cat := range categories {
		cLower := strings.ToLower(cat.name)
		for key, kws := range keywordMap {
			if strings.Contains(cLower, key) {
				for _, kw := range kws {
					if strings.Contains(lowerNote, kw) {
						return cat.id, cat.name, nil
					}
				}
			}
		}
	}

	// Fallback to first available category
	return categories[0].id, categories[0].name, nil
}

func parseAmountAndNote(input string) (float64, string, error) {
	input = strings.TrimSpace(input)
	parts := strings.Fields(input)
	if len(parts) == 0 {
		return 0, "", fmt.Errorf("empty input")
	}

	rawAmount := parts[0]
	note := ""
	if len(parts) > 1 {
		note = strings.Join(parts[1:], " ")
	}

	multiplier := 1.0
	lowerAmt := strings.ToLower(rawAmount)
	hasSuffix := false

	if strings.HasSuffix(lowerAmt, "k") || strings.HasSuffix(lowerAmt, "rb") {
		multiplier = 1000
		lowerAmt = strings.TrimSuffix(strings.TrimSuffix(lowerAmt, "k"), "rb")
		hasSuffix = true
	} else if strings.HasSuffix(lowerAmt, "jt") || strings.HasSuffix(lowerAmt, "m") {
		multiplier = 1000000
		lowerAmt = strings.TrimSuffix(strings.TrimSuffix(lowerAmt, "jt"), "m")
		hasSuffix = true
	}

	var cleanedAmt string
	if hasSuffix {
		cleanedAmt = strings.ReplaceAll(lowerAmt, ",", ".")
	} else {
		cleanedAmt = strings.ReplaceAll(lowerAmt, ".", "")
		cleanedAmt = strings.ReplaceAll(cleanedAmt, ",", "")
	}

	val, err := strconv.ParseFloat(cleanedAmt, 64)
	if err != nil {
		return 0, "", err
	}

	return val * multiplier, note, nil
}

func formatIDR(val float64) string {
	isNeg := val < 0
	intVal := int64(math.Round(math.Abs(val)))
	str := strconv.FormatInt(intVal, 10)
	n := len(str)
	var formatted string
	if n <= 3 {
		formatted = str
	} else {
		var sb strings.Builder
		remainder := n % 3
		if remainder > 0 {
			sb.WriteString(str[:remainder])
			if remainder < n {
				sb.WriteString(".")
			}
		}

		for i := remainder; i < n; i += 3 {
			sb.WriteString(str[i : i+3])
			if i+3 < n {
				sb.WriteString(".")
			}
		}
		formatted = sb.String()
	}

	if isNeg {
		return "-" + formatted
	}
	return formatted
}

func cleanNote(note string) string {
	if strings.TrimSpace(note) == "" {
		return "-"
	}
	return note
}

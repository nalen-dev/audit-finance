package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"finance-audit/api/internal/config"
	"finance-audit/api/internal/handler"
	"finance-audit/api/internal/middleware"
	"finance-audit/api/internal/repository"
	"finance-audit/api/internal/telegram"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := repository.NewDB(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Printf("Successfully connected to PostgreSQL at %s:%s/%s", cfg.DBHost, cfg.DBPort, cfg.DBName)

	// Start Telegram Bot Service
	bot := telegram.NewBot(cfg.TelegramBotToken, db)
	bot.Start()
	defer bot.Stop()

	// Handlers
	authHandler := handler.NewAuthHandler(db, cfg)
	walletHandler := handler.NewWalletHandler(db)
	catHandler := handler.NewCategoryHandler(db)
	txHandler := handler.NewTransactionHandler(db)
	budgetHandler := handler.NewBudgetHandler(db)
	analyticsHandler := handler.NewAnalyticsHandler(db)

	r := chi.NewRouter()

	// Middlewares
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","app":"OripioFin API"}`))
	})

	// Public Routes
	r.Post("/api/auth/register", authHandler.Register)
	r.Post("/api/auth/login", authHandler.Login)

	// Protected Routes
	r.Group(func(protected chi.Router) {
		protected.Use(middleware.AuthMiddleware(cfg))

		// User
		protected.Get("/api/auth/me", authHandler.Me)
		protected.Put("/api/auth/telegram", authHandler.UpdateTelegram)
		protected.Put("/api/auth/mode", authHandler.UpdateAppMode)
		protected.Put("/api/auth/cycle-day", authHandler.UpdateBudgetCycleStartDay)

		// Wallets
		protected.Get("/api/wallets", walletHandler.List)
		protected.Post("/api/wallets", walletHandler.Create)
		protected.Put("/api/wallets/{id}", walletHandler.Update)
		protected.Delete("/api/wallets/{id}", walletHandler.Delete)

		// Categories
		protected.Get("/api/categories", catHandler.List)
		protected.Post("/api/categories", catHandler.Create)
		protected.Put("/api/categories/{id}", catHandler.Update)
		protected.Delete("/api/categories/{id}", catHandler.Delete)

		// Transactions
		protected.Get("/api/transactions", txHandler.List)
		protected.Post("/api/transactions", txHandler.Create)
		protected.Put("/api/transactions/{id}", txHandler.Update)
		protected.Delete("/api/transactions/{id}", txHandler.Delete)

		// Budgets
		protected.Get("/api/budgets", budgetHandler.List)
		protected.Post("/api/budgets", budgetHandler.Set)
		protected.Delete("/api/budgets/{id}", budgetHandler.Delete)

		// Analytics
		protected.Get("/api/analytics/summary", analyticsHandler.GetSummary)
	})

	addr := ":" + cfg.ServerPort
	log.Printf("Server listening on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server stopped with error: %v", err)
	}
}

package service

import (
	"testing"
	"time"
)

func TestCalculateBudgetCycle(t *testing.T) {
	// Scenario 1: Today is 12 Oct 2026, startDay is 25
	// Cycle should be 2026-09-25 to 2026-10-24
	ref1 := time.Date(2026, 10, 12, 10, 0, 0, 0, time.UTC)
	cycle1 := CalculateBudgetCycle(25, ref1)
	if cycle1.StartDateStr != "2026-09-25" {
		t.Errorf("Expected StartDate 2026-09-25, got %s", cycle1.StartDateStr)
	}
	if cycle1.EndDateStr != "2026-10-24" {
		t.Errorf("Expected EndDate 2026-10-24, got %s", cycle1.EndDateStr)
	}
	if cycle1.DaysRemaining != 13 {
		t.Errorf("Expected DaysRemaining 13, got %d", cycle1.DaysRemaining)
	}

	// Scenario 2: Today is 25 Oct 2026 (Payday), startDay is 25
	// Cycle should be 2026-10-25 to 2026-11-24
	ref2 := time.Date(2026, 10, 25, 8, 0, 0, 0, time.UTC)
	cycle2 := CalculateBudgetCycle(25, ref2)
	if cycle2.StartDateStr != "2026-10-25" {
		t.Errorf("Expected StartDate 2026-10-25, got %s", cycle2.StartDateStr)
	}
	if cycle2.EndDateStr != "2026-11-24" {
		t.Errorf("Expected EndDate 2026-11-24, got %s", cycle2.EndDateStr)
	}
	if cycle2.DaysRemaining != 31 {
		t.Errorf("Expected DaysRemaining 31, got %d", cycle2.DaysRemaining)
	}

	// Scenario 3: Normal calendar month (startDay = 1), today is 12 Oct 2026
	ref3 := time.Date(2026, 10, 12, 10, 0, 0, 0, time.UTC)
	cycle3 := CalculateBudgetCycle(1, ref3)
	if cycle3.StartDateStr != "2026-10-01" {
		t.Errorf("Expected StartDate 2026-10-01, got %s", cycle3.StartDateStr)
	}
	if cycle3.EndDateStr != "2026-10-31" {
		t.Errorf("Expected EndDate 2026-10-31, got %s", cycle3.EndDateStr)
	}
	if cycle3.DaysRemaining != 20 {
		t.Errorf("Expected DaysRemaining 20, got %d", cycle3.DaysRemaining)
	}
}

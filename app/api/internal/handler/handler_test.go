package handler

import (
	"testing"

	"finance-audit/api/internal/model"
)

func TestNormalizeTransactionTime(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "empty", input: "", want: ""},
		{name: "whitespace", input: "   ", want: ""},
		{name: "hhmm", input: "09:30", want: "09:30:00"},
		{name: "hhmmss", input: "18:52:44", want: "18:52:44"},
		{name: "midnight", input: "00:00", want: "00:00:00"},
		{name: "invalid hour", input: "25:00", wantErr: true},
		{name: "invalid format", input: "6pm", wantErr: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := normalizeTransactionTime(tc.input)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error for %q, got %q", tc.input, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error for %q: %v", tc.input, err)
			}
			if got != tc.want {
				t.Fatalf("got %q, want %q", got, tc.want)
			}
		})
	}
}

func TestComputeGoalDerivedFields(t *testing.T) {
	g := model.SavingsGoal{
		TargetAmount:  10000000,
		CurrentAmount: 2500000,
	}
	computeGoalDerivedFields(&g)
	if g.RemainingAmount != 7500000 {
		t.Fatalf("expected remaining 7500000, got %v", g.RemainingAmount)
	}
	if g.Percentage != 25 {
		t.Fatalf("expected 25%%, got %v", g.Percentage)
	}
	if g.IsCompleted {
		t.Fatal("expected IsCompleted false")
	}

	gDone := model.SavingsGoal{
		TargetAmount:  5000000,
		CurrentAmount: 6000000,
	}
	computeGoalDerivedFields(&gDone)
	if gDone.RemainingAmount != 0 {
		t.Fatalf("expected remaining 0 when exceeded, got %v", gDone.RemainingAmount)
	}
	if !gDone.IsCompleted {
		t.Fatal("expected IsCompleted true when current >= target")
	}
}

func TestNormalizeGoalDate(t *testing.T) {
	empty := "  "
	res, err := normalizeGoalDate(&empty)
	if err != nil || res != nil {
		t.Fatalf("expected nil, nil for empty date, got %v, %v", res, err)
	}

	valid := "2026-12-31"
	res, err = normalizeGoalDate(&valid)
	if err != nil || res == nil || *res != "2026-12-31" {
		t.Fatalf("expected 2026-12-31, got %v, %v", res, err)
	}

	invalid := "31-12-2026"
	if _, err := normalizeGoalDate(&invalid); err == nil {
		t.Fatal("expected error for invalid date format")
	}
}

package service

import (
	"time"
)

type CycleRange struct {
	StartDay      int       `json:"start_day"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	StartDateStr  string    `json:"start_date_str"` // YYYY-MM-DD
	EndDateStr    string    `json:"end_date_str"`   // YYYY-MM-DD
	DaysRemaining int       `json:"days_remaining"` // Hari tersisa sampai end_date (inklusif hari ini, min 1)
	TotalDays     int       `json:"total_days"`
	ElapsedDays   int       `json:"elapsed_days"`
}

// clampDay ensures day is valid for the given year and month (e.g. Feb 31 -> Feb 28/29)
func clampDay(year int, month time.Month, targetDay int) int {
	maxDay := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
	if targetDay > maxDay {
		return maxDay
	}
	if targetDay < 1 {
		return 1
	}
	return targetDay
}

// CalculateBudgetCycle computes the start and end dates of the active financial cycle for a given startDay (1..31)
func CalculateBudgetCycle(startDay int, refDate time.Time) CycleRange {
	if startDay < 1 || startDay > 31 {
		startDay = 1
	}

	year, month, day := refDate.Date()
	today := time.Date(year, month, day, 0, 0, 0, 0, refDate.Location())

	var startDate, endDate time.Time

	if startDay == 1 {
		// Normal calendar month: 1st until last day of month
		startDate = time.Date(year, month, 1, 0, 0, 0, 0, refDate.Location())
		lastDay := time.Date(year, month+1, 0, 0, 0, 0, 0, refDate.Location()).Day()
		endDate = time.Date(year, month, lastDay, 0, 0, 0, 0, refDate.Location())
	} else {
		if day >= startDay {
			// Current cycle started this month on startDay (e.g. 25 Oct -> 24 Nov)
			clampedStart := clampDay(year, month, startDay)
			startDate = time.Date(year, month, clampedStart, 0, 0, 0, 0, refDate.Location())

			nextMonth := month + 1
			nextYear := year
			if nextMonth > 12 {
				nextMonth = 1
				nextYear++
			}
			clampedNextCutoff := clampDay(nextYear, nextMonth, startDay)
			nextCutoffDate := time.Date(nextYear, nextMonth, clampedNextCutoff, 0, 0, 0, 0, refDate.Location())
			endDate = nextCutoffDate.AddDate(0, 0, -1)
		} else {
			// Current cycle started last month on startDay (e.g. 25 Sep -> 24 Oct)
			prevMonth := month - 1
			prevYear := year
			if prevMonth < 1 {
				prevMonth = 12
				prevYear--
			}
			clampedPrevCutoff := clampDay(prevYear, prevMonth, startDay)
			startDate = time.Date(prevYear, prevMonth, clampedPrevCutoff, 0, 0, 0, 0, refDate.Location())

			clampedCurrentCutoff := clampDay(year, month, startDay)
			currentCutoffDate := time.Date(year, month, clampedCurrentCutoff, 0, 0, 0, 0, refDate.Location())
			endDate = currentCutoffDate.AddDate(0, 0, -1)
		}
	}

	totalDays := int(endDate.Sub(startDate).Hours()/24) + 1
	daysRemaining := int(endDate.Sub(today).Hours()/24) + 1
	if daysRemaining < 1 {
		daysRemaining = 1
	}
	elapsedDays := int(today.Sub(startDate).Hours() / 24)
	if elapsedDays < 0 {
		elapsedDays = 0
	}

	return CycleRange{
		StartDay:      startDay,
		StartDate:     startDate,
		EndDate:       endDate,
		StartDateStr:  startDate.Format("2006-01-02"),
		EndDateStr:    endDate.Format("2006-01-02"),
		DaysRemaining: daysRemaining,
		TotalDays:     totalDays,
		ElapsedDays:   elapsedDays,
	}
}

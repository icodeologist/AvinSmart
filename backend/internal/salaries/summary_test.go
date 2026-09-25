package salaries

import (
	"testing"

	"avinsmart/backend/internal/money"
)

func TestPayrollUsesConfiguredWorkingDays(t *testing.T) {
	amount := payableAmount(money.MustParse("100.00"), 5, 22)
	if amount.String() != "22.73" {
		t.Fatalf("payable amount = %s, want 22.73", amount.String())
	}
}

func TestDefaultWorkingDaysExcludesWeekends(t *testing.T) {
	if got := defaultWorkingDays("2026-09"); got != 22 {
		t.Fatalf("working days = %d, want 22", got)
	}
}

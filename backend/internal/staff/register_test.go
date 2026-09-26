package staff

import "testing"

func TestRegisterValidationRequiresOutletForOperationalStaff(t *testing.T) {
	for _, role := range []string{"sales", "inventory_staff"} {
		payload := registerRequest{
			Name:        "Counter user",
			Email:       "counter@example.com",
			Password:    "password123",
			Phone:       "1234567890",
			Role:        role,
			PhotoBase64: "data:image/png;base64,ZmFrZQ==",
		}
		fields := payload.validate()
		if !fields.HasErrors() {
			t.Fatalf("role %q without outlet assignment should fail validation", role)
		}
		if _, ok := fields["outlet_ids"]; !ok {
			t.Fatalf("role %q did not report outlet_ids validation", role)
		}
	}
}

func TestRegisterValidationRejectsRemovedRole(t *testing.T) {
	payload := registerRequest{
		Name:        "Support user",
		Email:       "support@example.com",
		Password:    "password123",
		Phone:       "1234567890",
		Role:        "support",
		PhotoBase64: "data:image/png;base64,ZmFrZQ==",
	}
	if fields := payload.validate(); !fields.HasErrors() {
		t.Fatal("removed support role should be rejected")
	}
}

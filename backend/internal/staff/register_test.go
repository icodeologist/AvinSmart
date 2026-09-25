package staff

import "testing"

func TestRegisterValidationRequiresOutletForOperationalStaff(t *testing.T) {
	for _, role := range []string{"manager", "sales", "inventory"} {
		payload := registerRequest{
			Name:     "Counter user",
			Email:    "counter@example.com",
			Password: "password123",
			Phone:    "1234567890",
			Role:     role,
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

func TestRegisterValidationAllowsSupportWithoutOutlet(t *testing.T) {
	payload := registerRequest{
		Name:     "Support user",
		Email:    "support@example.com",
		Password: "password123",
		Phone:    "1234567890",
		Role:     "support",
	}
	if fields := payload.validate(); fields.HasErrors() {
		t.Fatalf("support user without an outlet should be valid: %v", fields)
	}
}

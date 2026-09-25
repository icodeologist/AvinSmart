package bills

import "net/http"

// MarkLegacyFlow tells existing bill clients where new POS integrations must
// move without breaking the old invoice-compatible endpoint immediately.
func MarkLegacyFlow(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Deprecation", "true")
		w.Header().Set("Link", "</api/v1/orders>; rel=\"successor\"")
		w.Header().Set("X-Canonical-Sale-Flow", "/api/v1/orders")
		next.ServeHTTP(w, r)
	})
}

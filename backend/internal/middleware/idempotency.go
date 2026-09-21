package middleware

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"avinsmart/backend/internal/api"
	"avinsmart/backend/internal/models"

	"gorm.io/gorm"
)

const maxIdempotencyBody = 5 << 20

// Idempotent protects a POST operation from duplicate retries. The key is
// scoped to the operation and the request body must be identical on replay.
func Idempotent(db *gorm.DB) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
			if key == "" {
				api.WriteError(w, http.StatusBadRequest, "Idempotency-Key header is required")
				return
			}
			if len(key) > 128 {
				api.WriteError(w, http.StatusBadRequest, "Idempotency-Key must be 128 characters or fewer")
				return
			}

			body, err := io.ReadAll(io.LimitReader(r.Body, maxIdempotencyBody+1))
			if err != nil {
				api.WriteError(w, http.StatusBadRequest, "could not read request body")
				return
			}
			if len(body) > maxIdempotencyBody {
				api.WriteError(w, http.StatusRequestEntityTooLarge, "request body is too large")
				return
			}
			r.Body = io.NopCloser(strings.NewReader(string(body)))

			hashInput := r.Method + "\n" + r.URL.Path + "\n" + string(body)
			digest := sha256.Sum256([]byte(hashInput))
			record := models.IdempotencyRecord{
				Operation:   r.Method + " " + r.URL.Path,
				Key:         key,
				RequestHash: hex.EncodeToString(digest[:]),
			}

			if err := db.Create(&record).Error; err != nil {
				var existing models.IdempotencyRecord
				if !api.IsUniqueViolation(err) || db.Where("operation = ? AND key = ?", record.Operation, key).First(&existing).Error != nil {
					api.WriteError(w, http.StatusInternalServerError, "could not reserve idempotency key")
					return
				}
				if existing.RequestHash != record.RequestHash {
					api.WriteError(w, http.StatusConflict, "Idempotency-Key was already used with a different request")
					return
				}
				if existing.ResponseStatus == 0 {
					w.Header().Set("Retry-After", "1")
					api.WriteError(w, http.StatusConflict, "the request with this Idempotency-Key is still processing")
					return
				}
				replayResponse(w, existing)
				return
			}

			recorder := &responseRecorder{header: make(http.Header), body: &strings.Builder{}, status: http.StatusOK}
			next.ServeHTTP(recorder, r)
			record.ResponseStatus = recorder.status
			record.ResponseBody = recorder.body.String()
			record.ResponseHeader = marshalHeaders(recorder.header)
			if err := db.Save(&record).Error; err != nil {
				// The business operation already ran. Do not turn a successful sale
				// into a second sale because persistence of the replay metadata failed.
				// The error is intentionally surfaced only in server logs by GORM.
				returnRecordedResponse(w, recorder)
				return
			}
			returnRecordedResponse(w, recorder)
		})
	}
}

type responseRecorder struct {
	header http.Header
	body   *strings.Builder
	status int
}

func (r *responseRecorder) Header() http.Header    { return r.header }
func (r *responseRecorder) WriteHeader(status int) { r.status = status }
func (r *responseRecorder) Write(body []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.body.Write(body)
}

func returnRecordedResponse(w http.ResponseWriter, r *responseRecorder) {
	for key, values := range r.header {
		w.Header()[key] = values
	}
	w.WriteHeader(r.status)
	_, _ = w.Write([]byte(r.body.String()))
}

func replayResponse(w http.ResponseWriter, record models.IdempotencyRecord) {
	var headers http.Header
	if err := json.Unmarshal([]byte(record.ResponseHeader), &headers); err == nil {
		for key, values := range headers {
			w.Header()[key] = values
		}
	}
	w.WriteHeader(record.ResponseStatus)
	_, _ = w.Write([]byte(record.ResponseBody))
}

func marshalHeaders(headers http.Header) string {
	data, err := json.Marshal(headers)
	if err != nil {
		return "{}"
	}
	return string(data)
}

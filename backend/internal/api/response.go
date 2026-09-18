package api

import (
	"encoding/json"
	"net/http"
)

type envelope struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
	Fields  Fields `json:"fields,omitempty"`
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func WriteSuccess(w http.ResponseWriter, statusCode int, data any) {
	writeJSON(w, statusCode, envelope{Success: true, Data: data})
}

func WriteError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, envelope{Success: false, Error: message})
}

func WriteValidation(w http.ResponseWriter, message string, fields Fields) {
	writeJSON(w, http.StatusBadRequest, envelope{
		Success: false,
		Error:   message,
		Fields:  fields,
	})
}

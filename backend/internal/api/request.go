package api

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/mail"
)

var ErrInvalidJSON = errors.New("invalid json body")

func DecodeJSON(r *http.Request, destination any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(destination); err != nil {
		return ErrInvalidJSON
	}

	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return ErrInvalidJSON
	}

	return nil
}

func IsValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

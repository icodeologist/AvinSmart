package auth

import (
	"errors"
	"fmt"
	"time"

	"avinsmart/backend/internal/config"

	"github.com/golang-jwt/jwt"
)

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	UserID   uint   `json:"user_id"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	UserType string `json:"user_type"`
	jwt.StandardClaims
}

type Principal struct {
	UserID   uint
	Email    string
	Role     string
	UserType string
}

func IssueToken(cfg config.Config, userID uint, email, role, userType string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Email:    email,
		Role:     role,
		UserType: userType,
		StandardClaims: jwt.StandardClaims{
			Subject:   fmt.Sprint(userID),
			Issuer:    cfg.JWTIssuer,
			IssuedAt:  now.Unix(),
			ExpiresAt: now.Add(cfg.JWTExpiry).Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func ParseToken(cfg config.Config, rawToken string) (Principal, error) {
	parsed, err := jwt.ParseWithClaims(rawToken, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, ErrInvalidToken
		}
		return []byte(cfg.JWTSecret), nil
	})
	if err != nil || !parsed.Valid {
		return Principal{}, ErrInvalidToken
	}

	claims, ok := parsed.Claims.(*Claims)
	if !ok || claims.UserID == 0 || claims.Issuer != cfg.JWTIssuer {
		return Principal{}, ErrInvalidToken
	}

	return Principal{
		UserID:   claims.UserID,
		Email:    claims.Email,
		Role:     claims.Role,
		UserType: claims.UserType,
	}, nil
}

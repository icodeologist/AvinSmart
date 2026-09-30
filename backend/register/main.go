// Command register creates an administrator from a trusted terminal.
// Run it from the backend directory with: go run ./register
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"net/mail"
	"os"
	"path/filepath"
	"strings"
	"time"

	"avinsmart/backend/internal/config"
	"avinsmart/backend/internal/database"
	"avinsmart/backend/internal/models"

	"golang.org/x/crypto/bcrypt"
	"golang.org/x/term"
)

func main() {
	username := flag.String("username", "", "administrator name")
	email := flag.String("email", "", "administrator email")
	phone := flag.String("phone", "", "administrator phone number")
	password := flag.String("password", "", "administrator password (omit to enter it privately)")
	photo := flag.String("photo", "", "optional path to a profile photo")
	flag.Parse()

	reader := bufio.NewReader(os.Stdin)
	var err error
	if strings.TrimSpace(*username) == "" {
		*username, err = prompt(reader, "Admin name: ")
		fatalIf(err)
	}
	if strings.TrimSpace(*email) == "" {
		*email, err = prompt(reader, "Email: ")
		fatalIf(err)
	}
	if strings.TrimSpace(*phone) == "" {
		*phone, err = prompt(reader, "Phone: ")
		fatalIf(err)
	}
	if *password == "" {
		fmt.Fprint(os.Stderr, "Password: ")
		raw, readErr := term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Fprintln(os.Stderr)
		fatalIf(readErr)
		*password = string(raw)
	}

	*username = strings.TrimSpace(*username)
	*email = strings.TrimSpace(*email)
	*phone = strings.TrimSpace(*phone)
	if *username == "" || *phone == "" {
		fatal(errors.New("name and phone are required"))
	}
	parsedEmail, err := mail.ParseAddress(*email)
	fatalIf(err)
	if parsedEmail.Address != *email {
		fatal(errors.New("email must be a valid email address"))
	}
	if len(*password) < 8 {
		fatal(errors.New("password must be at least 8 characters"))
	}

	cfg := config.Load()
	db, err := database.Connect(context.Background(), cfg.DatabaseURL)
	fatalIf(err)
	if err := database.AutoMigrate(db); err != nil {
		fatal(fmt.Errorf("database migration failed: %w", err))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(*password), bcrypt.DefaultCost)
	fatalIf(err)
	photoPath, err := copyPhoto(*photo)
	fatalIf(err)

	admin := models.Admin{
		Username:     *username,
		Email:        *email,
		PasswordHash: string(hash),
		PhoneNum:     *phone,
		Photo:        photoPath,
	}
	if err := db.Create(&admin).Error; err != nil {
		fatal(fmt.Errorf("could not create admin: %w", err))
	}

	fmt.Printf("Admin created successfully: %s <%s> (id %d)\n", admin.Username, admin.Email, admin.ID)
}

func prompt(reader *bufio.Reader, label string) (string, error) {
	fmt.Fprint(os.Stdout, label)
	value, err := reader.ReadString('\n')
	return strings.TrimSpace(value), err
}

func copyPhoto(source string) (string, error) {
	if strings.TrimSpace(source) == "" {
		return "", nil
	}
	raw, err := os.ReadFile(source)
	if err != nil {
		return "", err
	}
	if len(raw) == 0 || len(raw) > 10<<20 {
		return "", errors.New("photo must be between 1 byte and 10 MB")
	}
	ext := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}[httpContentType(raw)]
	if ext == "" {
		return "", errors.New("photo must be JPEG, PNG, WEBP, or GIF")
	}
	dir := staticDirectory()
	uploadDir := filepath.Join(dir, "images", "uploads")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", err
	}
	name := fmt.Sprintf("admin-cli-%d%s", time.Now().UnixNano(), ext)
	if err := os.WriteFile(filepath.Join(uploadDir, name), raw, 0o644); err != nil {
		return "", err
	}
	return "/static/images/uploads/" + name, nil
}

func httpContentType(raw []byte) string {
	if len(raw) > 512 {
		raw = raw[:512]
	}
	// DetectContentType is kept local so the CLI does not need the HTTP server package.
	if len(raw) >= 8 && string(raw[:8]) == "\x89PNG\r\n\x1a\n" {
		return "image/png"
	}
	if len(raw) >= 3 && string(raw[:3]) == "\xff\xd8\xff" {
		return "image/jpeg"
	}
	if len(raw) >= 6 && (string(raw[:6]) == "GIF87a" || string(raw[:6]) == "GIF89a") {
		return "image/gif"
	}
	if len(raw) >= 12 && string(raw[:4]) == "RIFF" && string(raw[8:12]) == "WEBP" {
		return "image/webp"
	}
	return ""
}

func staticDirectory() string {
	for _, dir := range []string{"static", "../static", "../../static", "backend/static"} {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir
		}
	}
	return "static"
}

func fatalIf(err error) {
	if err != nil {
		fatal(err)
	}
}

func fatal(err error) {
	fmt.Fprintln(os.Stderr, "register:", err)
	os.Exit(1)
}

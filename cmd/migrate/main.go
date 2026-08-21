package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func main() {
	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	if dsn == "" {
		log.Fatal("OECS_HUB_DATABASE_DSN is required")
	}

	migrationsDir := os.Getenv("OECS_HUB_MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "migrations"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("failed to open database connection: %v", err)
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("failed to set goose dialect: %v", err)
	}

	if err := goose.Up(db, migrationsDir); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}

	log.Println("migrations applied successfully")
}

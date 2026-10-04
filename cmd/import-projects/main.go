// Command import-projects copies every user project into the external projects API. It is idempotent:
// projects that already exist there are skipped.
package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	projectsv1 "github.com/ChargePi/oecs-hub/gen/proto/projects/v1"
	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type storedCharger struct {
	ChargerVariantID uuid.UUID `json:"chargerVariantId"`
	Note             *string   `json:"note,omitempty"`
}

type storedProject struct {
	ID          uuid.UUID
	IdentityID  uuid.UUID
	Name        string
	Description *string
	Chargers    []storedCharger
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func main() {
	dryRun := flag.Bool("dry-run", false, "only report what would be imported")
	flag.Parse()

	logger, _ := zap.NewProduction()
	defer func() { _ = logger.Sync() }()

	dsn := os.Getenv("OECS_HUB_DATABASE_DSN")
	address := os.Getenv("OECS_HUB_PLANNING_ADMIN_ADDRESS")
	secret := os.Getenv("OECS_HUB_AUTH_GATEWAY_SECRET")

	if dsn == "" || (!*dryRun && (address == "" || secret == "")) {
		logger.Fatal("OECS_HUB_DATABASE_DSN, OECS_HUB_PLANNING_ADMIN_ADDRESS and OECS_HUB_AUTH_GATEWAY_SECRET are required")
	}

	ctx := context.Background()

	projects, err := loadProjects(ctx, dsn)
	if err != nil {
		logger.Fatal("failed to read projects", zap.Error(err))
	}

	logger.Info("Loaded projects", zap.Int("count", len(projects)))

	if *dryRun {
		return
	}

	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		logger.Fatal("failed to create projects admin client", zap.Error(err))
	}
	defer func() { _ = conn.Close() }()

	client := projectsv1.NewProjectAdminServiceClient(conn)
	ctx = metadata.AppendToOutgoingContext(ctx, "x-gateway-secret", secret)

	var imported, skipped, failed int

	for _, p := range projects {
		resp, err := client.ImportProject(ctx, importRequest(p))
		if err != nil {
			failed++
			logger.Error("failed to import project", zap.Stringer("projectId", p.ID), zap.Error(err))

			continue
		}

		if resp.GetAlreadyExisted() {
			skipped++
			continue
		}

		imported++
	}

	logger.Info("Import finished", zap.Int("imported", imported), zap.Int("skipped", skipped), zap.Int("failed", failed))

	if failed > 0 {
		os.Exit(1)
	}
}

func loadProjects(ctx context.Context, dsn string) ([]storedProject, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	defer func() { _ = db.Close() }()

	rows, err := db.QueryContext(ctx, `SELECT id, identity_id, name, description, chargers, created_at, updated_at FROM user_projects ORDER BY created_at`)
	if err != nil {
		return nil, fmt.Errorf("query user_projects: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var projects []storedProject

	for rows.Next() {
		var (
			p        storedProject
			chargers []byte
		)

		if err := rows.Scan(&p.ID, &p.IdentityID, &p.Name, &p.Description, &chargers, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan project: %w", err)
		}

		if err := json.Unmarshal(chargers, &p.Chargers); err != nil {
			return nil, fmt.Errorf("decode chargers of project %s: %w", p.ID, err)
		}

		projects = append(projects, p)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read projects: %w", err)
	}

	return projects, nil
}

func importRequest(p storedProject) *projectsv1.ImportProjectRequest {
	req := &projectsv1.ImportProjectRequest{
		Id:              p.ID.String(),
		OwnerIdentityId: p.IdentityID.String(),
		Name:            p.Name,
		Description:     p.Description,
		CreatedAt:       timestamppb.New(p.CreatedAt),
		UpdatedAt:       timestamppb.New(p.UpdatedAt),
	}

	for _, c := range p.Chargers {
		req.Chargers = append(req.Chargers, &projectsv1.ProjectCharger{ChargerVariantId: c.ChargerVariantID.String(), Note: c.Note})
	}

	return req
}

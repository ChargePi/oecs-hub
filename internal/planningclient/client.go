// Package planningclient stores user projects in the external projects API instead of the local database.
package planningclient

import (
	"context"
	"fmt"
	"strings"

	projectsv1 "github.com/ChargePi/oecs-hub/gen/proto/projects/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type Client struct {
	projects      projectsv1.ProjectServiceClient
	conn          *grpc.ClientConn
	gatewaySecret string
}

func New(address, gatewaySecret string) (*Client, error) {
	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(insecure.NewCredentials()), grpc.WithStatsHandler(otelgrpc.NewClientHandler()))
	if err != nil {
		return nil, fmt.Errorf("dial projects API %s: %w", address, err)
	}

	return &Client{projects: projectsv1.NewProjectServiceClient(conn), conn: conn, gatewaySecret: gatewaySecret}, nil
}

func (c *Client) Close() error {
	return c.conn.Close()
}

func (c *Client) CreateProject(ctx context.Context, p *userchargers.Project) error {
	resp, err := c.projects.CreateProject(c.outgoing(ctx), &projectsv1.CreateProjectRequest{Name: p.Name, Description: p.Description})
	if err != nil {
		return mapError("create project", err)
	}

	created, err := projectFromProto(resp.GetProject(), nil)
	if err != nil {
		return err
	}

	created.IdentityID = p.IdentityID
	*p = *created

	return nil
}

func (c *Client) GetProject(ctx context.Context, identityID, id uuid.UUID) (*userchargers.Project, error) {
	resp, err := c.projects.GetProject(c.outgoing(ctx), &projectsv1.GetProjectRequest{Id: id.String()})
	if err != nil {
		return nil, mapError("get project", err)
	}

	p, err := projectFromProto(resp.GetProject(), resp.GetChargers())
	if err != nil {
		return nil, err
	}

	p.IdentityID = identityID

	return p, nil
}

func (c *Client) ListProjects(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]*userchargers.Project, int64, error) {
	if offset%max(limit, 1) != 0 {
		return nil, 0, fmt.Errorf("%w: offset must be a multiple of the page size", userchargers.ErrInvalidProject)
	}

	var (
		token string
		resp  *projectsv1.ListProjectsResponse
		err   error
	)

	for page := uint32(0); page <= offset/max(limit, 1); page++ {
		resp, err = c.projects.ListProjects(c.outgoing(ctx), &projectsv1.ListProjectsRequest{PageSize: int32(limit), PageToken: token}) //nolint:gosec // bounded by MaxPageSize
		if err != nil {
			return nil, 0, mapError("list projects", err)
		}

		token = resp.GetNextPageToken()
		if token == "" && page < offset/max(limit, 1) {
			return nil, resp.GetTotalSize(), nil
		}
	}

	projects := make([]*userchargers.Project, 0, len(resp.GetProjects()))

	for _, pb := range resp.GetProjects() {
		p, err := projectFromProto(pb, nil)
		if err != nil {
			return nil, 0, err
		}

		p.IdentityID = identityID
		projects = append(projects, p)
	}

	return projects, resp.GetTotalSize(), nil
}

func (c *Client) UpdateProjectAttributes(ctx context.Context, identityID, id uuid.UUID, attrs userchargers.ProjectAttributes) (*userchargers.Project, error) {
	resp, err := c.projects.UpdateProject(c.outgoing(ctx), &projectsv1.UpdateProjectRequest{Id: id.String(), Name: attrs.Name, Description: attrs.Description})
	if err != nil {
		return nil, mapError("update project", err)
	}

	p, err := projectFromProto(resp.GetProject(), nil)
	if err != nil {
		return nil, err
	}

	p.IdentityID = identityID

	return p, nil
}

func (c *Client) DeleteProject(ctx context.Context, _, id uuid.UUID) error {
	if _, err := c.projects.DeleteProject(c.outgoing(ctx), &projectsv1.DeleteProjectRequest{Id: id.String()}); err != nil {
		return mapError("delete project", err)
	}

	return nil
}

// ApplyChargerChanges sends the difference between the current and the desired list as one atomic batch.
func (c *Client) ApplyChargerChanges(ctx context.Context, identityID, id uuid.UUID, apply func([]userchargers.ProjectCharger) ([]userchargers.ProjectCharger, error)) (*userchargers.Project, error) {
	current, err := c.GetProject(ctx, identityID, id)
	if err != nil {
		return nil, err
	}

	next, err := apply(current.Chargers)
	if err != nil {
		return nil, fmt.Errorf("apply charger changes: %w", err)
	}

	req := &projectsv1.ManageProjectChargersRequest{ProjectId: id.String(), Changes: diff(current.Chargers, next)}
	for _, ch := range next {
		req.OrderedChargerVariantIds = append(req.OrderedChargerVariantIds, ch.ChargerVariantID.String())
	}

	resp, err := c.projects.ManageProjectChargers(c.outgoing(ctx), req)
	if err != nil {
		return nil, mapError("manage project chargers", err)
	}

	p, err := projectFromProto(resp.GetProject(), resp.GetChargers())
	if err != nil {
		return nil, err
	}

	p.IdentityID = identityID

	return p, nil
}

func diff(current, next []userchargers.ProjectCharger) []*projectsv1.ProjectChargerChange {
	before := make(map[uuid.UUID]*string, len(current))
	for _, ch := range current {
		before[ch.ChargerVariantID] = ch.Note
	}

	var changes []*projectsv1.ProjectChargerChange

	kept := make(map[uuid.UUID]bool, len(next))

	for _, ch := range next {
		kept[ch.ChargerVariantID] = true

		note, existed := before[ch.ChargerVariantID]

		switch {
		case !existed:
			changes = append(changes, &projectsv1.ProjectChargerChange{
				ChargerVariantId: ch.ChargerVariantID.String(), Action: projectsv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_ADD, Note: ch.Note,
			})
		case !sameNote(note, ch.Note):
			changes = append(changes, &projectsv1.ProjectChargerChange{
				ChargerVariantId: ch.ChargerVariantID.String(), Action: projectsv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_SET_NOTE, Note: ch.Note,
			})
		}
	}

	for _, ch := range current {
		if !kept[ch.ChargerVariantID] {
			changes = append(changes, &projectsv1.ProjectChargerChange{
				ChargerVariantId: ch.ChargerVariantID.String(), Action: projectsv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_REMOVE,
			})
		}
	}

	return changes
}

func sameNote(a, b *string) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}

	return *a == *b
}

func (c *Client) outgoing(ctx context.Context) context.Context {
	md := metadata.Pairs("x-gateway-secret", c.gatewaySecret)

	if identity, ok := auth.FromContext(ctx); ok {
		md.Set("x-user-id", identity.ID)
		md.Set("x-user-email", identity.Email)
		md.Set("x-user-type", identity.UserType)
	}

	return metadata.NewOutgoingContext(ctx, md)
}

func projectFromProto(pb *projectsv1.Project, chargers []*projectsv1.ProjectCharger) (*userchargers.Project, error) {
	id, err := uuid.Parse(pb.GetId())
	if err != nil {
		return nil, fmt.Errorf("decode project id %q: %w", pb.GetId(), err)
	}

	p := &userchargers.Project{
		ID:           id,
		Name:         pb.GetName(),
		Description:  pb.Description,
		ChargerCount: pb.GetChargerCount(),
		CreatedAt:    pb.GetCreatedAt().AsTime(),
		UpdatedAt:    pb.GetUpdatedAt().AsTime(),
	}

	if chargers == nil {
		return p, nil
	}

	p.Chargers = make([]userchargers.ProjectCharger, 0, len(chargers))

	for _, ch := range chargers {
		variantID, err := uuid.Parse(ch.GetChargerVariantId())
		if err != nil {
			return nil, fmt.Errorf("decode charger id %q: %w", ch.GetChargerVariantId(), err)
		}

		p.Chargers = append(p.Chargers, userchargers.ProjectCharger{ChargerVariantID: variantID, Note: ch.Note})
	}

	p.ChargerCount = int64(len(p.Chargers))

	return p, nil
}

func mapError(op string, err error) error {
	st := status.Convert(err)

	switch st.Code() {
	case codes.NotFound, codes.PermissionDenied:
		return fmt.Errorf("%s: %w", op, userchargers.ErrNotFound)
	case codes.InvalidArgument:
		if strings.Contains(st.Message(), "ordering") {
			return fmt.Errorf("%s: %w", op, userchargers.ErrInvalidOrdering)
		}

		return fmt.Errorf("%s: %w: %s", op, userchargers.ErrInvalidProject, st.Message())
	default:
		return fmt.Errorf("%s: %w", op, err)
	}
}

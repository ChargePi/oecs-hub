package grpc

import (
	"context"
	"errors"

	userchargersv1 "github.com/ChargePi/oecs-hub/gen/proto/userchargers/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/pagination"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// UserFavoriteService is the subset of userchargers.Service the favorites handler needs.
type UserFavoriteService interface {
	SetFavorite(ctx context.Context, identityID, variantID uuid.UUID, favorited bool) (bool, error)
	ListFavorites(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]userchargers.FavoriteEntry, int64, error)
}

// UserProjectService is the subset of userchargers.Service the projects handler needs.
type UserProjectService interface {
	CreateProject(ctx context.Context, identityID uuid.UUID, name string, description *string) (*userchargers.Project, error)
	UpdateProject(ctx context.Context, identityID, id uuid.UUID, attrs userchargers.ProjectAttributes) (*userchargers.Project, error)
	DeleteProject(ctx context.Context, identityID, id uuid.UUID) error
	ListProjects(ctx context.Context, identityID uuid.UUID, limit, offset uint32) ([]*userchargers.Project, int64, error)
	GetProject(ctx context.Context, identityID, id uuid.UUID) (*userchargers.Project, []userchargers.ProjectChargerEntry, error)
	ManageChargers(ctx context.Context, identityID, id uuid.UUID, changes []userchargers.ChargerChange, ordering []uuid.UUID) (*userchargers.Project, []userchargers.ProjectChargerEntry, error)
}

// UserRatingService is the subset of userchargers.Service the ratings handler needs. The
// deprecated RegistryService.SubmitVariantRating shim depends on SubmitRating too.
type UserRatingService interface {
	SubmitRating(ctx context.Context, variantID, raterIdentityID uuid.UUID, inputs []userchargers.RatingInput) (userchargers.RatingsSummary, error)
	ListMyRatings(ctx context.Context, raterIdentityID uuid.UUID, limit, offset uint32) ([]userchargers.MyRatingEntry, int64, error)
}

// FavoriteHandler implements userchargers.v1.FavoriteService.
type FavoriteHandler struct {
	userchargersv1.UnimplementedFavoriteServiceServer

	favorites UserFavoriteService
}

func NewFavoriteHandler(favorites UserFavoriteService) *FavoriteHandler {
	return &FavoriteHandler{favorites: favorites}
}

// ProjectHandler implements userchargers.v1.ProjectService. The paid-plan gate lives in
// userchargers.Service, not here - see userChargersError for how it reaches the client.
type ProjectHandler struct {
	userchargersv1.UnimplementedProjectServiceServer

	projects UserProjectService
}

func NewProjectHandler(projects UserProjectService) *ProjectHandler {
	return &ProjectHandler{projects: projects}
}

// RatingHandler implements userchargers.v1.RatingService.
type RatingHandler struct {
	userchargersv1.UnimplementedRatingServiceServer

	ratings UserRatingService
}

func NewRatingHandler(ratings UserRatingService) *RatingHandler {
	return &RatingHandler{ratings: ratings}
}

// requireIndividualIdentity resolves the authenticated caller and rejects anyone who isn't
// an individual account, returning their identity ID for scoping. The mirror of
// requireManufacturerIdentity - like it, eligibility isn't checked at the Oathkeeper edge.
func requireIndividualIdentity(ctx context.Context) (uuid.UUID, error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return uuid.Nil, err
	}

	if identity.UserType != "individual" {
		return uuid.Nil, status.Error(codes.PermissionDenied, "only individual accounts can access this API")
	}

	identityID, err := uuid.Parse(identity.ID)
	if err != nil {
		return uuid.Nil, status.Error(codes.Internal, "invalid identity id from proxy")
	}

	return identityID, nil
}

// userChargersError maps this package's domain errors onto gRPC codes. A free plan and an
// undeterminable plan deliberately differ: PermissionDenied means "upgrade", Unavailable
// means "billing didn't answer", and the web app shows different things for each.
func userChargersError(err error) error {
	switch {
	case errors.Is(err, userchargers.ErrPaidPlanRequired):
		return status.Error(codes.PermissionDenied, userchargers.ErrPaidPlanRequired.Error())
	case errors.Is(err, userchargers.ErrNotFound):
		return status.Error(codes.NotFound, "project not found")
	case errors.Is(err, userchargers.ErrVariantNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, userchargers.ErrInvalidProject),
		errors.Is(err, userchargers.ErrInvalidOrdering),
		errors.Is(err, userchargers.ErrInvalidCategory),
		errors.Is(err, userchargers.ErrInvalidScore):
		return status.Error(codes.InvalidArgument, err.Error())
	case status.Code(err) != codes.Unknown:
		// Already a status error - an auth failure raised further down, typically.
		return err
	default:
		// Everything left is a failure to reach a dependency (billing, Postgres, Redis)
		// rather than anything the caller can fix.
		return status.Error(codes.Unavailable, err.Error())
	}
}

func (h *FavoriteHandler) FavoriteCharger(ctx context.Context, req *userchargersv1.FavoriteChargerRequest) (*userchargersv1.FavoriteChargerResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	variantID, err := uuid.Parse(req.GetChargerVariantId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid charger_variant_id")
	}

	var favorited bool

	switch req.GetState() {
	case userchargersv1.FavoriteState_FAVORITE_STATE_FAVORITED:
		favorited = true
	case userchargersv1.FavoriteState_FAVORITE_STATE_UNFAVORITED:
		favorited = false
	case userchargersv1.FavoriteState_FAVORITE_STATE_UNSPECIFIED:
		return nil, status.Error(codes.InvalidArgument, "state is required")
	default:
		return nil, status.Error(codes.InvalidArgument, "unknown state")
	}

	result, err := h.favorites.SetFavorite(ctx, identityID, variantID, favorited)
	if err != nil {
		return nil, userChargersError(err)
	}

	return &userchargersv1.FavoriteChargerResponse{
		ChargerVariantId: variantID.String(),
		Favorited:        result,
	}, nil
}

func (h *FavoriteHandler) ListFavorites(ctx context.Context, req *userchargersv1.ListFavoritesRequest) (*userchargersv1.ListFavoritesResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), userchargers.DefaultPageSize, userchargers.MaxPageSize)

	entries, total, err := h.favorites.ListFavorites(ctx, identityID, limit, offset)
	if err != nil {
		return nil, userChargersError(err)
	}

	favorites := make([]*userchargersv1.Favorite, len(entries))
	for i, entry := range entries {
		favorites[i] = &userchargersv1.Favorite{
			Summary:     chargerToProtoSummary(entry.Charger),
			FavoritedAt: timestamppb.New(entry.FavoritedAt),
		}
	}

	return &userchargersv1.ListFavoritesResponse{
		Favorites:     favorites,
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(entries), total),
	}, nil
}

func (h *ProjectHandler) CreateProject(ctx context.Context, req *userchargersv1.CreateProjectRequest) (*userchargersv1.CreateProjectResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	project, err := h.projects.CreateProject(ctx, identityID, req.GetName(), req.Description)
	if err != nil {
		return nil, userChargersError(err)
	}

	return &userchargersv1.CreateProjectResponse{Project: projectToProto(project)}, nil
}

func (h *ProjectHandler) UpdateProject(ctx context.Context, req *userchargersv1.UpdateProjectRequest) (*userchargersv1.UpdateProjectResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	if req.Name == nil && req.Description == nil {
		return nil, status.Error(codes.InvalidArgument, "at least one attribute is required")
	}

	project, err := h.projects.UpdateProject(ctx, identityID, id, userchargers.ProjectAttributes{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		return nil, userChargersError(err)
	}

	return &userchargersv1.UpdateProjectResponse{Project: projectToProto(project)}, nil
}

func (h *ProjectHandler) DeleteProject(ctx context.Context, req *userchargersv1.DeleteProjectRequest) (*emptypb.Empty, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	if err := h.projects.DeleteProject(ctx, identityID, id); err != nil {
		return nil, userChargersError(err)
	}

	return &emptypb.Empty{}, nil
}

func (h *ProjectHandler) ListProjects(ctx context.Context, req *userchargersv1.ListProjectsRequest) (*userchargersv1.ListProjectsResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), userchargers.DefaultPageSize, userchargers.MaxPageSize)

	projects, total, err := h.projects.ListProjects(ctx, identityID, limit, offset)
	if err != nil {
		return nil, userChargersError(err)
	}

	out := make([]*userchargersv1.Project, len(projects))
	for i, project := range projects {
		out[i] = projectToProto(project)
	}

	return &userchargersv1.ListProjectsResponse{
		Projects:      out,
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(projects), total),
	}, nil
}

func (h *ProjectHandler) GetProject(ctx context.Context, req *userchargersv1.GetProjectRequest) (*userchargersv1.GetProjectResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(req.GetId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid id")
	}

	project, entries, err := h.projects.GetProject(ctx, identityID, id)
	if err != nil {
		return nil, userChargersError(err)
	}

	return &userchargersv1.GetProjectResponse{
		Project:  projectToProto(project),
		Chargers: projectChargersToProto(entries),
	}, nil
}

func (h *ProjectHandler) ManageProjectChargers(ctx context.Context, req *userchargersv1.ManageProjectChargersRequest) (*userchargersv1.ManageProjectChargersResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	id, err := uuid.Parse(req.GetProjectId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid project_id")
	}

	changes, err := chargerChangesFromProto(req.GetChanges())
	if err != nil {
		return nil, err
	}

	ordering := make([]uuid.UUID, len(req.GetOrderedChargerVariantIds()))

	for i, raw := range req.GetOrderedChargerVariantIds() {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid ordered_charger_variant_ids entry")
		}

		ordering[i] = parsed
	}

	project, entries, err := h.projects.ManageChargers(ctx, identityID, id, changes, ordering)
	if err != nil {
		return nil, userChargersError(err)
	}

	return &userchargersv1.ManageProjectChargersResponse{
		Project:  projectToProto(project),
		Chargers: projectChargersToProto(entries),
	}, nil
}

func (h *RatingHandler) SubmitRating(ctx context.Context, req *userchargersv1.SubmitRatingRequest) (*userchargersv1.SubmitRatingResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	variantID, err := uuid.Parse(req.GetChargerVariantId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid charger_variant_id")
	}

	if len(req.GetRatings()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "ratings is required")
	}

	inputs := make([]userchargers.RatingInput, len(req.GetRatings()))
	for i, r := range req.GetRatings() {
		inputs[i] = userchargers.RatingInput{CategoryName: r.GetCategoryName(), Score: int(r.GetScore())}
	}

	summary, err := h.ratings.SubmitRating(ctx, variantID, identityID, inputs)
	if err != nil {
		return nil, userChargersError(err)
	}

	return &userchargersv1.SubmitRatingResponse{
		ChargerVariantId: variantID.String(),
		Ratings:          ratingsSummaryToProto(summary),
	}, nil
}

func (h *RatingHandler) ListMyRatings(ctx context.Context, req *userchargersv1.ListMyRatingsRequest) (*userchargersv1.ListMyRatingsResponse, error) {
	identityID, err := requireIndividualIdentity(ctx)
	if err != nil {
		return nil, err
	}

	offset, err := pagination.DecodeOffset(req.GetPageToken())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}

	limit := pagination.ClampPageSize(int(req.GetPageSize()), userchargers.DefaultPageSize, userchargers.MaxPageSize)

	entries, total, err := h.ratings.ListMyRatings(ctx, identityID, limit, offset)
	if err != nil {
		return nil, userChargersError(err)
	}

	ratings := make([]*userchargersv1.MyRating, len(entries))

	for i, entry := range entries {
		scores := make([]*userchargersv1.RatingInput, len(entry.Scores))
		for j, score := range entry.Scores {
			scores[j] = &userchargersv1.RatingInput{
				CategoryName: score.CategoryName,
				Score:        int32(score.Score),
			}
		}

		ratings[i] = &userchargersv1.MyRating{
			Summary:  chargerToProtoSummary(entry.Charger),
			MyScores: scores,
			// The aggregate rides along on the charger row, so this is free.
			Aggregate: ratingsToProto(entry.Charger.Ratings),
			RatedAt:   timestamppb.New(entry.RatedAt),
		}
	}

	return &userchargersv1.ListMyRatingsResponse{
		Ratings:       ratings,
		TotalSize:     total,
		NextPageToken: pagination.NextToken(offset, len(entries), total),
	}, nil
}

func chargerChangesFromProto(in []*userchargersv1.ProjectChargerChange) ([]userchargers.ChargerChange, error) {
	changes := make([]userchargers.ChargerChange, len(in))

	for i, change := range in {
		variantID, err := uuid.Parse(change.GetChargerVariantId())
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "invalid charger_variant_id in changes")
		}

		var action userchargers.ChargerChangeAction

		switch change.GetAction() {
		case userchargersv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_ADD:
			action = userchargers.ChargerChangeAdd
		case userchargersv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_REMOVE:
			action = userchargers.ChargerChangeRemove
		case userchargersv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_SET_NOTE:
			action = userchargers.ChargerChangeSetNote
		case userchargersv1.ProjectChargerAction_PROJECT_CHARGER_ACTION_UNSPECIFIED:
			return nil, status.Error(codes.InvalidArgument, "action is required for every change")
		default:
			return nil, status.Error(codes.InvalidArgument, "unknown action in changes")
		}

		changes[i] = userchargers.ChargerChange{
			ChargerVariantID: variantID,
			Action:           action,
			Note:             change.Note,
		}
	}

	return changes, nil
}

func projectToProto(p *userchargers.Project) *userchargersv1.Project {
	return &userchargersv1.Project{
		Id:           p.ID.String(),
		Name:         p.Name,
		Description:  p.Description,
		ChargerCount: int64(len(p.Chargers)),
		CreatedAt:    timestamppb.New(p.CreatedAt),
		UpdatedAt:    timestamppb.New(p.UpdatedAt),
	}
}

func projectChargersToProto(entries []userchargers.ProjectChargerEntry) []*userchargersv1.ProjectCharger {
	out := make([]*userchargersv1.ProjectCharger, len(entries))
	for i, entry := range entries {
		out[i] = &userchargersv1.ProjectCharger{
			Summary: chargerToProtoSummary(entry.Charger),
			Note:    entry.Note,
		}
	}

	return out
}

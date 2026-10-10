// Package vector maintains the Qdrant index behind semantic charger search. Postgres
// remains the source of truth: the index only holds an embedding per verified charger,
// keyed by charger ID, and is kept in sync by charger.Service on writes.
package vector

import (
	"context"
	"errors"
	"fmt"

	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/cloudwego/eino/components/embedding"
	"github.com/google/uuid"
	"github.com/qdrant/go-client/qdrant"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/codes"
)

var tracer = otel.Tracer("vector.charger_index")

// dimensionProbe is embedded once by EnsureCollection to learn the embedder's output size.
const dimensionProbe = "dimension probe"

type Config struct {
	Host       string
	Port       int
	Collection string
	// TopK caps how many chargers a search returns.
	TopK int
	// MinScore is the cosine similarity below which a charger isn't a match.
	MinScore float64
}

// ChargerIndex implements charger.SemanticIndex.
type ChargerIndex struct {
	client     *qdrant.Client
	embedder   embedding.Embedder
	collection string
	topK       uint64
	minScore   float32
}

func NewChargerIndex(cfg Config, embedder embedding.Embedder) (*ChargerIndex, error) {
	client, err := qdrant.NewClient(&qdrant.Config{Host: cfg.Host, Port: cfg.Port})
	if err != nil {
		return nil, fmt.Errorf("create qdrant client: %w", err)
	}

	return &ChargerIndex{
		client:     client,
		embedder:   embedder,
		collection: cfg.Collection,
		topK:       uint64(cfg.TopK),
		minScore:   float32(cfg.MinScore),
	}, nil
}

func (i *ChargerIndex) Close() error {
	err := i.client.Close()
	if err != nil {
		return fmt.Errorf("close qdrant client: %w", err)
	}

	return nil
}

// EnsureCollection creates the collection, sized to the embedder's output, if missing.
func (i *ChargerIndex) EnsureCollection(ctx context.Context) error {
	exists, err := i.client.CollectionExists(ctx, i.collection)
	if err != nil {
		return fmt.Errorf("check collection: %w", err)
	}

	if exists {
		return nil
	}

	probe, err := i.embed(ctx, dimensionProbe)
	if err != nil {
		return fmt.Errorf("probe embedder dimension: %w", err)
	}

	err = i.client.CreateCollection(ctx, &qdrant.CreateCollection{
		CollectionName: i.collection,
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     uint64(len(probe)),
			Distance: qdrant.Distance_Cosine,
		}),
	})
	if err != nil {
		return fmt.Errorf("create collection: %w", err)
	}

	return nil
}

func (i *ChargerIndex) Upsert(ctx context.Context, c *charger.Charger) error {
	ctx, span := tracer.Start(ctx, "vector.ChargerIndex.Upsert")
	defer span.End()

	err := i.upsert(ctx, c)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return err
	}

	return nil
}

func (i *ChargerIndex) upsert(ctx context.Context, c *charger.Charger) error {
	document, err := chargerDocument(c.Spec)
	if err != nil {
		return fmt.Errorf("build charger document: %w", err)
	}

	vector, err := i.embed(ctx, document)
	if err != nil {
		return fmt.Errorf("embed charger document: %w", err)
	}

	_, err = i.client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: i.collection,
		Wait:           qdrant.PtrOf(true),
		Points: []*qdrant.PointStruct{{
			Id:      qdrant.NewIDUUID(c.ID.String()),
			Vectors: qdrant.NewVectorsDense(vector),
			Payload: qdrant.NewValueMap(map[string]any{
				"manufacturer": c.ManufacturerName,
				"series":       c.Series,
				"model":        c.ModelName,
				"type":         c.ChargerType,
			}),
		}},
	})
	if err != nil {
		return fmt.Errorf("upsert point: %w", err)
	}

	return nil
}

func (i *ChargerIndex) Remove(ctx context.Context, id uuid.UUID) error {
	ctx, span := tracer.Start(ctx, "vector.ChargerIndex.Remove")
	defer span.End()

	_, err := i.client.Delete(ctx, &qdrant.DeletePoints{
		CollectionName: i.collection,
		Wait:           qdrant.PtrOf(true),
		Points:         qdrant.NewPointsSelector(qdrant.NewIDUUID(id.String())),
	})
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return fmt.Errorf("delete point: %w", err)
	}

	return nil
}

func (i *ChargerIndex) Search(ctx context.Context, query string) ([]uuid.UUID, error) {
	ctx, span := tracer.Start(ctx, "vector.ChargerIndex.Search")
	defer span.End()

	ids, err := i.search(ctx, query)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())

		return nil, err
	}

	return ids, nil
}

func (i *ChargerIndex) search(ctx context.Context, query string) ([]uuid.UUID, error) {
	vector, err := i.embed(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("embed query: %w", err)
	}

	points, err := i.client.Query(ctx, &qdrant.QueryPoints{
		CollectionName: i.collection,
		Query:          qdrant.NewQueryDense(vector),
		Limit:          &i.topK,
		ScoreThreshold: &i.minScore,
	})
	if err != nil {
		return nil, fmt.Errorf("query points: %w", err)
	}

	ids := make([]uuid.UUID, 0, len(points))

	for _, p := range points {
		id, err := uuid.Parse(p.GetId().GetUuid())
		if err != nil {
			return nil, fmt.Errorf("parse point id: %w", err)
		}

		ids = append(ids, id)
	}

	return ids, nil
}

func (i *ChargerIndex) embed(ctx context.Context, text string) ([]float32, error) {
	vectors, err := i.embedder.EmbedStrings(ctx, []string{text})
	if err != nil {
		return nil, fmt.Errorf("embed: %w", err)
	}

	if len(vectors) != 1 || len(vectors[0]) == 0 {
		return nil, errors.New("embedder returned no vector")
	}

	vector := make([]float32, len(vectors[0]))
	for j, v := range vectors[0] {
		vector[j] = float32(v)
	}

	return vector, nil
}

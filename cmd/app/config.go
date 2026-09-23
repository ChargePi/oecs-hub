package main

import (
	"time"

	"github.com/xBlaz3kx/DevX/observability"
)

type DatabaseConfiguration struct {
	DSN string `json:"dsn" mapstructure:"dsn" validate:"required" yaml:"dsn"`
}

type RedisConfiguration struct {
	Address  string        `json:"address"  mapstructure:"address"  validate:"required" yaml:"address"`
	Password string        `json:"password" mapstructure:"password" yaml:"password"`
	DB       int           `json:"db"       mapstructure:"db"       yaml:"db"`
	CacheTTL time.Duration `json:"cacheTtl" mapstructure:"cacheTtl" yaml:"cacheTtl"`
}

// MemgraphConfiguration configures the Bolt connection to the Memgraph graph projection.
type MemgraphConfiguration struct {
	Address  string `json:"address"  mapstructure:"address"  validate:"required" yaml:"address"`
	Username string `json:"username" mapstructure:"username" yaml:"username"`
	Password string `json:"password" mapstructure:"password" yaml:"password"`
}

// GRPCConfiguration configures the public server, which serves both native gRPC and
// gRPC-Web on the same port. AllowedOrigins is only consulted for gRPC-Web requests
// that hit this port directly, cross-origin - same-origin requests through the web
// app's nginx/vite proxy never need it.
type GRPCConfiguration struct {
	Address        string   `json:"address"        mapstructure:"address"        validate:"required" yaml:"address"`
	AllowedOrigins []string `json:"allowedOrigins" mapstructure:"allowedOrigins"                      yaml:"allowedOrigins"`
}

// AdminGRPCConfiguration configures the separate gRPC server exposing the AdminAPI.
type AdminGRPCConfiguration struct {
	Address string `json:"address" mapstructure:"address" validate:"required" yaml:"address"`
}

// AuthConfiguration configures how the backend trusts identity headers injected by the
// Traefik/Oathkeeper edge - see internal/auth. The backend never talks to Kratos/Oathkeeper
// itself; GatewaySecret just proves a request was routed (and authenticated/authorized)
// through that edge rather than hitting a gRPC port directly.
type AuthConfiguration struct {
	GatewaySecret string `json:"gatewaySecret" mapstructure:"gatewaySecret" validate:"required" yaml:"gatewaySecret"`
}

// KratosConfiguration points at Kratos's admin API (never the public one) - used to look
// up identity traits the Oathkeeper edge doesn't forward as headers, e.g. company name.
type KratosConfiguration struct {
	AdminURL string `json:"adminUrl" mapstructure:"adminUrl" validate:"required" yaml:"adminUrl"`
}

// BillingConfiguration points at oecs-billing-service's gRPC port - the only source of
// plan tiers, since there is no local plans table. Reached directly by container name
// rather than through Traefik/Oathkeeper: this is a service-to-service call that forwards
// the caller's identity headers itself, see internal/entitlement.
type BillingConfiguration struct {
	Address string `json:"address" mapstructure:"address" validate:"required" yaml:"address"`
	// TierCacheTTL is the window in which a plan change isn't visible yet, so it is kept
	// short.
	TierCacheTTL time.Duration `json:"tierCacheTtl" mapstructure:"tierCacheTtl" yaml:"tierCacheTtl"`
}

// BifrostConfiguration points the prompt-suggestions LLM client at Bifrost
// (github.com/maximhq/bifrost), an OpenAI-API-compatible proxy already deployed by the sibling
// oecs-recommendation-agent repo on this service's own docker network (oecs-hub_default) -
// reused here rather than adding a second LLM proxy.
type BifrostConfiguration struct {
	BaseURL string `json:"baseUrl" mapstructure:"baseUrl" validate:"required" yaml:"baseUrl"`
	APIKey  string `json:"apiKey"  mapstructure:"apiKey"  yaml:"apiKey"`
	// Model is in Bifrost's "provider/model" form (e.g. "gemini/gemini-3.1-flash-lite") - see
	// oecs-recommendation-agent's BifrostConfig for why the provider must be named explicitly.
	Model string `json:"model" mapstructure:"model" validate:"required" yaml:"model"`
}

// PromptSuggestionsConfiguration configures internal/promptsuggestion.Service.
type PromptSuggestionsConfiguration struct {
	// RefreshInterval is the cache TTL for a topic's pool - expiry is what triggers the next
	// regeneration (there is no background refresh job), so this is really "how stale
	// suggestions are allowed to get".
	RefreshInterval time.Duration `json:"refreshInterval" mapstructure:"refreshInterval" validate:"required" yaml:"refreshInterval"`
	// PoolSize is how many distinct suggestions are generated and cached per topic on each
	// regeneration - not what's returned per request.
	PoolSize int `json:"poolSize" mapstructure:"poolSize" validate:"required" yaml:"poolSize"`
	// ReturnCount is how many of a topic's cached pool are randomly sampled and returned per
	// request.
	ReturnCount int `json:"returnCount" mapstructure:"returnCount" validate:"required" yaml:"returnCount"`
}

type Configuration struct {
	Database          DatabaseConfiguration          `json:"database"          mapstructure:"database"          validate:"required" yaml:"database"`
	Redis             RedisConfiguration             `json:"redis"             mapstructure:"redis"             validate:"required" yaml:"redis"`
	Memgraph          MemgraphConfiguration          `json:"memgraph"          mapstructure:"memgraph"          validate:"required" yaml:"memgraph"`
	Observability     observability.Config           `json:"observability"     mapstructure:"observability"     validate:"required" yaml:"observability"`
	GRPC              GRPCConfiguration              `json:"grpc"              mapstructure:"grpc"              validate:"required" yaml:"grpc"`
	AdminGRPC         AdminGRPCConfiguration         `json:"adminGrpc"         mapstructure:"adminGrpc"         validate:"required" yaml:"adminGrpc"`
	Auth              AuthConfiguration              `json:"auth"              mapstructure:"auth"              validate:"required" yaml:"auth"`
	Kratos            KratosConfiguration            `json:"kratos"            mapstructure:"kratos"            validate:"required" yaml:"kratos"`
	Billing           BillingConfiguration           `json:"billing"           mapstructure:"billing"           validate:"required" yaml:"billing"`
	Bifrost           BifrostConfiguration           `json:"bifrost"           mapstructure:"bifrost"           validate:"required" yaml:"bifrost"`
	PromptSuggestions PromptSuggestionsConfiguration `json:"promptSuggestions" mapstructure:"promptSuggestions" validate:"required" yaml:"promptSuggestions"`
}

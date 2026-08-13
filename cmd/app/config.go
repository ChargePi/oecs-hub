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

type Configuration struct {
	Database      DatabaseConfiguration  `json:"database"      mapstructure:"database"      validate:"required" yaml:"database"`
	Redis         RedisConfiguration     `json:"redis"         mapstructure:"redis"         validate:"required" yaml:"redis"`
	Memgraph      MemgraphConfiguration  `json:"memgraph"      mapstructure:"memgraph"      validate:"required" yaml:"memgraph"`
	Observability observability.Config   `json:"observability" mapstructure:"observability" validate:"required" yaml:"observability"`
	GRPC          GRPCConfiguration      `json:"grpc"          mapstructure:"grpc"          validate:"required" yaml:"grpc"`
	AdminGRPC     AdminGRPCConfiguration `json:"adminGrpc"     mapstructure:"adminGrpc"     validate:"required" yaml:"adminGrpc"`
}

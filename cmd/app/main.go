package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"slices"
	"strings"
	"syscall"

	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/graph"
	grpcHandler "github.com/ChargePi/oecs-hub/internal/grpc"
	"github.com/ChargePi/oecs-hub/internal/grpc/adminserver"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/ChargePi/oecs-hub/internal/mcp"
	"github.com/ChargePi/oecs-hub/internal/oecsspec"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	redisStorage "github.com/ChargePi/oecs-hub/internal/storage/redis"
	grpc_zap "github.com/grpc-ecosystem/go-grpc-middleware/logging/zap"
	grpc_recovery "github.com/grpc-ecosystem/go-grpc-middleware/recovery"
	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/mark3labs/mcp-go/server"
	redisotel "github.com/redis/go-redis/extra/redisotel-native/v9"
	"github.com/redis/go-redis/v9"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/uptrace/opentelemetry-go-extra/otelgorm"
	devxCfg "github.com/xBlaz3kx/DevX/configuration"
	"github.com/xBlaz3kx/DevX/observability"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.uber.org/zap"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/health"
	"google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/status"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"moul.io/zapgorm2"
)

const (
	serviceName    = "oecs-hub"
	serviceVersion = "1.0.0-beta"
)

var (
	configurationFile string

	rootCmd = &cobra.Command{
		Use:     serviceName,
		Short:   "OECS Hub - a registry of Open EV Charger Specifications.",
		Long:    `OECS Hub is a registry of Open EV Charger Specifications (OECS), exposing a public search/submission API and an admin review API.`,
		Version: serviceVersion,
		Run: func(cmd *cobra.Command, args []string) {
			ctx := cmd.Context()
			cfg := getConfiguration()

			obs, err := observability.NewObservability(ctx, observability.ServiceInfo{
				Name:    serviceName,
				Version: serviceVersion,
			}, cfg.Observability)
			if err != nil {
				zap.L().Fatal("failed to setup observability", zap.Error(err))
			}
			defer obs.Shutdown(ctx)

			logger := zap.L()

			gormLogger := zapgorm2.New(logger)
			gormLogger.SetAsDefault()

			db, err := gorm.Open(postgres.Open(cfg.Database.DSN), &gorm.Config{Logger: gormLogger})
			if err != nil {
				logger.Fatal("failed to connect to database", zap.Error(err))
			}

			if err := db.Use(otelgorm.NewPlugin()); err != nil {
				logger.Fatal("failed to setup postgres tracing", zap.Error(err))
			}

			redisObs := redisotel.GetObservabilityInstance()
			if err := redisObs.Init(redisotel.NewConfig().WithEnabled(true)); err != nil {
				logger.Fatal("failed to setup redis observability", zap.Error(err))
			}

			defer func() {
				err := redisObs.Shutdown()
				if err != nil {
					logger.Error("failed to shut down redis observability", zap.Error(err))
				}
			}()

			redisClient := redis.NewClient(&redis.Options{
				Addr:     cfg.Redis.Address,
				Password: cfg.Redis.Password,
				DB:       cfg.Redis.DB,
			})

			graphClient, err := graph.NewClient(cfg.Memgraph.Address, cfg.Memgraph.Username, cfg.Memgraph.Password)
			if err != nil {
				logger.Fatal("failed to create memgraph client", zap.Error(err))
			}

			if err := graphClient.VerifyConnectivity(ctx); err != nil {
				logger.Fatal("failed to connect to memgraph", zap.Error(err))
			}

			defer func() {
				err := graphClient.Close(ctx)
				if err != nil {
					logger.Error("failed to close memgraph client", zap.Error(err))
				}
			}()

			validator, err := oecsspec.NewValidator()
			if err != nil {
				logger.Fatal("failed to compile OECS schema", zap.Error(err))
			}

			manufacturerRepo := postgresStorage.NewManufacturerRepository(db)
			manufacturerCache := redisStorage.NewManufacturerCache(redisClient, cfg.Redis.CacheTTL)
			manufacturerSvc := manufacturer.NewService(manufacturerRepo, manufacturerCache, graphClient)

			chargerRepo := postgresStorage.NewChargerRepository(db)
			chargerCache := redisStorage.NewChargerCache(redisClient, cfg.Redis.CacheTTL)
			chargerSvc := charger.NewService(chargerRepo, chargerCache, validator, manufacturerSvc, graphClient)

			mcpSrv := server.NewMCPServer(serviceName, serviceVersion)
			mcp.RegisterTools(mcpSrv, chargerSvc, manufacturerSvc)
			mcpHandler := server.NewStreamableHTTPServer(mcpSrv)

			recoveryHandler := func(p any) error {
				logger.Error("recovered from panic", zap.Any("panic", p), zap.String("stack", string(debug.Stack())))

				return status.Errorf(codes.Internal, "%s", p)
			}

			grpcServer := grpc.NewServer(
				grpc.StatsHandler(otelgrpc.NewServerHandler()),
				grpc.ChainUnaryInterceptor(
					grpc_zap.UnaryServerInterceptor(logger),
					grpc_recovery.UnaryServerInterceptor(grpc_recovery.WithRecoveryHandler(recoveryHandler)),
					auth.UnaryInterceptor(cfg.Auth.GatewaySecret),
				),
				grpc.ChainStreamInterceptor(
					grpc_zap.StreamServerInterceptor(logger),
					grpc_recovery.StreamServerInterceptor(grpc_recovery.WithRecoveryHandler(recoveryHandler)),
				),
			)

			grpc_health_v1.RegisterHealthServer(grpcServer, health.NewServer())
			registryv1.RegisterRegistryServiceServer(grpcServer, grpcHandler.NewHandler(chargerSvc, manufacturerSvc, graphClient))

			// Wraps grpcServer so the same port serves both native gRPC (grpcurl, service-to-service
			// callers) and gRPC-Web (browsers, which can't speak native gRPC's HTTP/2 trailers).
			wrappedGrpc := grpcweb.WrapServer(grpcServer,
				grpcweb.WithOriginFunc(func(origin string) bool {
					return slices.Contains(cfg.GRPC.AllowedOrigins, origin)
				}),
			)

			schemaFS, err := oecsspec.SchemaFS()
			if err != nil {
				logger.Fatal("failed to load embedded OECS schema filesystem", zap.Error(err))
			}

			schemaHandler := http.StripPrefix("/oecs-schema/", http.FileServer(http.FS(schemaFS)))

			httpServer := &http.Server{
				Addr: cfg.GRPC.Address,
				Handler: h2c.NewHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					switch {
					case r.URL.Path == "/healthz":
						w.WriteHeader(http.StatusOK)
						_, _ = w.Write([]byte("ok\n"))
					case r.URL.Path == "/mcp":
						mcpHandler.ServeHTTP(w, r)
					case strings.HasPrefix(r.URL.Path, "/oecs-schema/"):
						schemaHandler.ServeHTTP(w, r)
					case wrappedGrpc.IsGrpcWebRequest(r) || wrappedGrpc.IsAcceptableGrpcCorsRequest(r):
						wrappedGrpc.ServeHTTP(w, r)
					default:
						grpcServer.ServeHTTP(w, r)
					}
				}), &http2.Server{}),
			}

			go func() {
				logger.Info("Starting gRPC server", zap.String("address", cfg.GRPC.Address))

				err := httpServer.ListenAndServe()
				if err != nil && !errors.Is(err, http.ErrServerClosed) {
					logger.Fatal("failed to serve gRPC", zap.Error(err))
				}
			}()

			defer func() {
				err := httpServer.Shutdown(ctx)
				if err != nil {
					logger.Error("failed to shut down gRPC server", zap.Error(err))
				}
			}()

			// AdminAPI is served on its own gRPC server/port so it can be network-isolated
			// from the public registry API.
			adminGrpcServer := adminserver.NewServer(logger, chargerSvc, manufacturerSvc, cfg.Auth.GatewaySecret)
			if err := adminGrpcServer.Start(cfg.AdminGRPC.Address); err != nil {
				logger.Fatal("failed to start admin gRPC server", zap.Error(err))
			}
			defer adminGrpcServer.Shutdown(ctx)

			<-ctx.Done()
			logger.Info("Shutting down")
		},
	}
)

// InitConfig sets up the environment and loads the configuration from a file if the path is provided.
func InitConfig(configurationFilePath string) {
	setDefaults()
	devxCfg.SetupEnv(serviceName)
	devxCfg.InitConfig(configurationFilePath, "$HOME/oecs-hub/", "/usr/oecs-hub/config/")
}

// setDefaults sets the default values for the configuration.
func setDefaults() {
	devxCfg.SetDefaults(serviceName)
	viper.SetDefault("grpc.address", "0.0.0.0:50051")
	viper.SetDefault("adminGrpc.address", "0.0.0.0:50052")
	viper.SetDefault("redis.address", "localhost:6379")
	viper.SetDefault("redis.db", 0)
	viper.SetDefault("redis.cacheTtl", "1h")
	viper.SetDefault("memgraph.address", "bolt://localhost:7687")

	_ = viper.BindEnv("database.dsn", "OECS_HUB_DATABASE_DSN")
	_ = viper.BindEnv("redis.address", "OECS_HUB_REDIS_ADDRESS")
	_ = viper.BindEnv("redis.password", "OECS_HUB_REDIS_PASSWORD")
	_ = viper.BindEnv("redis.db", "OECS_HUB_REDIS_DB")
	_ = viper.BindEnv("redis.cacheTtl", "OECS_HUB_REDIS_CACHETTL")
	_ = viper.BindEnv("memgraph.address", "OECS_HUB_MEMGRAPH_ADDRESS")
	_ = viper.BindEnv("memgraph.username", "OECS_HUB_MEMGRAPH_USERNAME")
	_ = viper.BindEnv("memgraph.password", "OECS_HUB_MEMGRAPH_PASSWORD")
	_ = viper.BindEnv("grpc.address", "OECS_HUB_GRPC_ADDRESS")
	_ = viper.BindEnv("grpc.allowedOrigins", "OECS_HUB_GRPC_ALLOWED_ORIGINS")
	_ = viper.BindEnv("adminGrpc.address", "OECS_HUB_ADMIN_GRPC_ADDRESS")
	_ = viper.BindEnv("auth.gatewaySecret", "OECS_HUB_AUTH_GATEWAY_SECRET")
}

// getConfiguration gets the configuration from cache or file.
func getConfiguration() *Configuration {
	logger := zap.L()

	logger.Info("Getting configuration")
	defer logger.Info("Loaded and validated configuration!")

	var config Configuration

	devxCfg.GetConfiguration(viper.GetViper(), &config)

	return &config
}

func setupGlobalLogger() {
	logger, _ := zap.NewProduction()
	zap.ReplaceGlobals(logger)
}

func initConfig() {
	InitConfig(configurationFile)
}

func main() {
	rootCmd.PersistentFlags().StringVar(&configurationFile, "config", "", "configuration file path")

	cobra.OnInitialize(setupGlobalLogger, initConfig)

	ctx, cancel := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
		syscall.SIGINT,
		syscall.SIGQUIT,
	)
	defer cancel()

	err := rootCmd.ExecuteContext(ctx)
	if err != nil {
		zap.L().Fatal("Unable to run", zap.Error(err))
	}
}

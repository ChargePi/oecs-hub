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

	billingv1 "github.com/ChargePi/oecs-hub/gen/proto/billing/v1"
	manufacturerv1 "github.com/ChargePi/oecs-hub/gen/proto/manufacturer/v1"
	promptsv1 "github.com/ChargePi/oecs-hub/gen/proto/prompts/v1"
	registryv1 "github.com/ChargePi/oecs-hub/gen/proto/registry/v1"
	userchargersv1 "github.com/ChargePi/oecs-hub/gen/proto/userchargers/v1"
	"github.com/ChargePi/oecs-hub/internal/account"
	"github.com/ChargePi/oecs-hub/internal/auth"
	"github.com/ChargePi/oecs-hub/internal/charger"
	"github.com/ChargePi/oecs-hub/internal/entitlement"
	"github.com/ChargePi/oecs-hub/internal/graph"
	grpcHandler "github.com/ChargePi/oecs-hub/internal/grpc"
	"github.com/ChargePi/oecs-hub/internal/grpc/adminserver"
	"github.com/ChargePi/oecs-hub/internal/kratos"
	"github.com/ChargePi/oecs-hub/internal/manufacturer"
	"github.com/ChargePi/oecs-hub/internal/mcp"
	"github.com/ChargePi/oecs-hub/internal/oecsspec"
	"github.com/ChargePi/oecs-hub/internal/promptsuggestion"
	postgresStorage "github.com/ChargePi/oecs-hub/internal/storage/postgres"
	redisStorage "github.com/ChargePi/oecs-hub/internal/storage/redis"
	"github.com/ChargePi/oecs-hub/internal/useraction"
	"github.com/ChargePi/oecs-hub/internal/userchargers"
	"github.com/ChargePi/oecs-hub/internal/vector"
	openaiEmbedding "github.com/cloudwego/eino-ext/components/embedding/openai"
	"github.com/cloudwego/eino-ext/components/model/openai"
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
	"google.golang.org/grpc/credentials/insecure"
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

			var chargerIndex charger.SemanticIndex

			if cfg.SemanticSearch.Enabled {
				embedder, err := openaiEmbedding.NewEmbedder(ctx, &openaiEmbedding.EmbeddingConfig{
					APIKey:  cfg.Bifrost.APIKey,
					Model:   cfg.SemanticSearch.EmbeddingModel,
					BaseURL: cfg.Bifrost.BaseURL,
				})
				if err != nil {
					logger.Fatal("failed to create embedder", zap.Error(err))
				}

				index, err := vector.NewChargerIndex(vector.Config{
					Host:       cfg.SemanticSearch.QdrantHost,
					Port:       cfg.SemanticSearch.QdrantPort,
					Collection: cfg.SemanticSearch.Collection,
					TopK:       cfg.SemanticSearch.TopK,
					MinScore:   cfg.SemanticSearch.MinScore,
				}, embedder)
				if err != nil {
					logger.Fatal("failed to create charger index", zap.Error(err))
				}

				defer func() {
					err := index.Close()
					if err != nil {
						logger.Error("failed to close charger index", zap.Error(err))
					}
				}()

				// Not fatal: search falls back to name matching until Qdrant is reachable.
				if err := index.EnsureCollection(ctx); err != nil {
					logger.Warn("failed to ensure charger index collection", zap.Error(err))
				}

				chargerIndex = index
			}

			chargerRepo := postgresStorage.NewChargerRepository(db)
			chargerCache := redisStorage.NewChargerCache(redisClient, cfg.Redis.CacheTTL)
			chargerSvc := charger.NewService(chargerRepo, chargerCache, validator, manufacturerSvc, graphClient, chargerIndex)

			kratosAdmin := kratos.NewAdminClient(cfg.Kratos.AdminURL)
			accountSvc := account.NewService(kratos.NewSDKClient(cfg.Kratos.AdminURL))

			// oecs-billing-service is the only source of plan tiers - there is no local
			// plans table. grpc.NewClient doesn't dial here, so a billing service that is
			// down doesn't hold up startup; it surfaces per-request instead.
			billingConn, err := grpc.NewClient(cfg.Billing.Address,
				grpc.WithTransportCredentials(insecure.NewCredentials()),
				grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
			)
			if err != nil {
				logger.Fatal("failed to create billing client", zap.Error(err))
			}

			defer func() {
				if err := billingConn.Close(); err != nil {
					logger.Error("failed to close billing client", zap.Error(err))
				}
			}()

			entitlementSvc := entitlement.NewService(
				billingv1.NewBillingServiceClient(billingConn),
				redisStorage.NewTierCache(redisClient, cfg.Billing.TierCacheTTL),
				cfg.Auth.GatewaySecret,
			)

			userChargersRepo := postgresStorage.NewUserChargersRepository(db)
			userChargersSvc := userchargers.NewService(userChargersRepo, chargerSvc, chargerCache, entitlementSvc)

			pendingActionSvc := useraction.NewService(
				redisStorage.NewPendingActionStore(redisClient),
				userChargersSvc,
				chargerSvc,
				entitlementSvc,
				cfg.PendingActions.TTL,
			)

			mcpSrv := server.NewMCPServer(serviceName, serviceVersion)
			mcp.RegisterTools(mcpSrv, chargerSvc, manufacturerSvc)
			mcp.RegisterUserTools(mcpSrv, userChargersSvc, pendingActionSvc)
			// The user tools act for whoever the gateway-secret-backed x-user-* headers name,
			// resolved per request exactly like the gRPC interceptor does.
			mcpHandler := server.NewStreamableHTTPServer(mcpSrv,
				server.WithHTTPContextFunc(mcp.HTTPContextFunc(cfg.Auth.GatewaySecret)),
			)

			// promptsuggestion calls search_chargers as a genuine MCP tool call, in-process
			// against mcpSrv above (no network hop) - must be created after RegisterTools.
			mcpToolCaller, err := promptsuggestion.NewInProcessMCPCaller(ctx, mcpSrv)
			if err != nil {
				logger.Fatal("failed to create in-process MCP client", zap.Error(err))
			}

			llmClient, err := openai.NewChatModel(ctx, &openai.ChatModelConfig{
				APIKey:  cfg.Bifrost.APIKey,
				Model:   cfg.Bifrost.Model,
				BaseURL: cfg.Bifrost.BaseURL,
			})
			if err != nil {
				logger.Fatal("failed to create LLM chat model", zap.Error(err))
			}

			suggestionCache := redisStorage.NewPromptSuggestionCache(redisClient, cfg.PromptSuggestions.RefreshInterval)
			suggestionSvc := promptsuggestion.NewService(llmClient, mcpToolCaller, suggestionCache, promptsuggestion.Config{
				PoolSize:    cfg.PromptSuggestions.PoolSize,
				ReturnCount: cfg.PromptSuggestions.ReturnCount,
			})

			// Best-effort cache warm-up so the first real request isn't the one paying LLM
			// latency - not a recurring job; GetPool's own on-miss path is what keeps pools
			// fresh over the service's lifetime.
			go func() {
				if _, err := suggestionSvc.ListAll(context.Background()); err != nil {
					logger.Warn("failed to warm up prompt suggestion cache", zap.Error(err))
				}
			}()

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
			registryv1.RegisterRegistryServiceServer(grpcServer, grpcHandler.NewHandler(chargerSvc, manufacturerSvc, graphClient, kratosAdmin, accountSvc, userChargersSvc))
			manufacturerv1.RegisterManufacturerServiceServer(grpcServer, grpcHandler.NewManufacturerHandler(chargerSvc))
			userchargersv1.RegisterFavoriteServiceServer(grpcServer, grpcHandler.NewFavoriteHandler(userChargersSvc))
			userchargersv1.RegisterProjectServiceServer(grpcServer, grpcHandler.NewProjectHandler(userChargersSvc))
			userchargersv1.RegisterRatingServiceServer(grpcServer, grpcHandler.NewRatingHandler(userChargersSvc))
			userchargersv1.RegisterPendingActionServiceServer(grpcServer, grpcHandler.NewPendingActionHandler(pendingActionSvc))
			promptsv1.RegisterPromptSuggestionsServiceServer(grpcServer, grpcHandler.NewPromptSuggestionHandler(suggestionSvc))

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
	viper.SetDefault("billing.address", "billing-service:50060")
	viper.SetDefault("billing.tierCacheTtl", "5m")
	viper.SetDefault("bifrost.baseUrl", "http://bifrost:8080/v1")
	viper.SetDefault("bifrost.model", "gemini/gemini-3.1-flash-lite")
	viper.SetDefault("promptSuggestions.refreshInterval", "30m")
	viper.SetDefault("promptSuggestions.poolSize", 10)
	viper.SetDefault("promptSuggestions.returnCount", 1)
	viper.SetDefault("pendingActions.ttl", "15m")
	viper.SetDefault("semanticSearch.enabled", false)
	viper.SetDefault("semanticSearch.qdrantHost", "qdrant")
	viper.SetDefault("semanticSearch.qdrantPort", 6334)
	viper.SetDefault("semanticSearch.collection", "oecs_chargers")
	viper.SetDefault("semanticSearch.embeddingModel", "openai/text-embedding-3-small")
	viper.SetDefault("semanticSearch.topK", 100)
	viper.SetDefault("semanticSearch.minScore", 0.25)

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
	_ = viper.BindEnv("kratos.adminUrl", "OECS_HUB_KRATOS_ADMIN_URL")
	_ = viper.BindEnv("billing.address", "OECS_HUB_BILLING_ADDRESS")
	_ = viper.BindEnv("billing.tierCacheTtl", "OECS_HUB_BILLING_TIERCACHETTL")
	_ = viper.BindEnv("bifrost.baseUrl", "OECS_HUB_BIFROST_BASEURL")
	_ = viper.BindEnv("bifrost.apiKey", "OECS_HUB_BIFROST_APIKEY")
	_ = viper.BindEnv("bifrost.model", "OECS_HUB_BIFROST_MODEL")
	_ = viper.BindEnv("promptSuggestions.refreshInterval", "OECS_HUB_PROMPTSUGGESTIONS_REFRESHINTERVAL")
	_ = viper.BindEnv("promptSuggestions.poolSize", "OECS_HUB_PROMPTSUGGESTIONS_POOLSIZE")
	_ = viper.BindEnv("promptSuggestions.returnCount", "OECS_HUB_PROMPTSUGGESTIONS_RETURNCOUNT")
	_ = viper.BindEnv("pendingActions.ttl", "OECS_HUB_PENDINGACTIONS_TTL")
	_ = viper.BindEnv("semanticSearch.enabled", "OECS_HUB_SEMANTICSEARCH_ENABLED")
	_ = viper.BindEnv("semanticSearch.qdrantHost", "OECS_HUB_SEMANTICSEARCH_QDRANTHOST")
	_ = viper.BindEnv("semanticSearch.qdrantPort", "OECS_HUB_SEMANTICSEARCH_QDRANTPORT")
	_ = viper.BindEnv("semanticSearch.collection", "OECS_HUB_SEMANTICSEARCH_COLLECTION")
	_ = viper.BindEnv("semanticSearch.embeddingModel", "OECS_HUB_SEMANTICSEARCH_EMBEDDINGMODEL")
	_ = viper.BindEnv("semanticSearch.topK", "OECS_HUB_SEMANTICSEARCH_TOPK")
	_ = viper.BindEnv("semanticSearch.minScore", "OECS_HUB_SEMANTICSEARCH_MINSCORE")
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

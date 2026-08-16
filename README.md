# OECS Hub

**The open registry for EV charger specifications.**

Every manufacturer publishes charger specs their own way — scattered PDFs, inconsistent units, missing connector
details. OECS Hub fixes that by giving the industry a single, structured, searchable source of truth.

- **For drivers, installers and integrators** — discover chargers across every manufacturer in one place, and compare
  them side by side: power output, connector types, protocols, dimensions, and everything else that actually matters
  when picking a charger.
- **For manufacturers** — submit your charger specs against an open, versioned schema (OECS) and get them validated
  automatically. Every submission goes through a review workflow before it's published, so buyers can trust what they
  see.

The result is a growing, vendor-neutral map of the EV charging hardware landscape — searchable by spec, browsable as a
graph of manufacturers, models and shared components.

## Architecture & tech stack

OECS Hub exposes two gRPC APIs on separate ports, so the admin surface can be network-isolated from the public one,
backed by Postgres, Redis and a graph database, with a React single-page app on top.

```mermaid
flowchart LR
    web["Web SPA"] -- " gRPC-Web :50051 " --> registry
    admin["Admin / review tooling"] -- " gRPC :50052 " --> adminsvc

    subgraph hub["OECS Hub"]
        registry["RegistryService — public"]
        adminsvc["AdminService — internal"]
    end

    registry --> postgres[("PostgreSQL")]
    registry --> redis[("Redis")]
    registry --> memgraph[("Memgraph")]
    adminsvc --> postgres
    adminsvc --> memgraph
```

- **RegistryService** (public) — search and browse chargers and manufacturers, submit a new charger spec for review.
- **AdminService** (internal) — review and approve/reject submissions, manage manufacturers.

**Backend** — Go, PostgreSQL as the system of record, Redis as a cache, and Memgraph as a graph database for
manufacturer/model/connector relationships (powers the graph explorer view). Submitted specs are validated against the
OECS JSON schema.

**Frontend** (`web/`) — a React SPA (Vite, Tailwind, shadcn/ui) that talks to the backend over gRPC-Web, with an
interactive graph view of the charger landscape.

APIs are proto-first — definitions live in `proto/`, generating both the Go server code and the TypeScript client.

## Local development

### Prerequisites

- Go 1.26+
- Node 20+ and [pnpm](https://pnpm.io/) 10.13+
- Docker (for Postgres, Redis and Memgraph)

### 1. Start the infrastructure

```sh
docker compose -f deployments/docker/docker-compose.dev.yaml up -d
```

This brings up Postgres (`localhost:5434`), Redis (`localhost:6379`) and Memgraph (`localhost:7687`).

### 2. Configure and migrate

```sh
cp config/config.example.yaml config/config.yaml

export OECS_HUB_DATABASE_DSN="postgres://oecs:oecs@localhost:5434/oecs_hub?sslmode=disable"
go run ./cmd/migrate
```

### 3. Run the backend

```sh
go run ./cmd/app --config config/config.yaml
```

Serves the public RegistryService (+ gRPC-Web) on `:50051` and the AdminService on `:50052`.

### 4. Run the frontend

```sh
cd web
pnpm install
pnpm dev            # http://localhost:5173
```

See `web/README.md` for frontend-specific commands (lint, typecheck, build, Docker).

### Tests & linting

```sh
go test ./...
golangci-lint run
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started and our
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE.md](LICENSE.md).

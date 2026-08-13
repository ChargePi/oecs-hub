# OECS HUB — web

Frontend for the OECS (Open EV Charger Specification) registry: an explorer for manufacturers,
products and variants, a spec comparison view, and a standalone product showcase page.

React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui, dark-mode-only black/red theme.

## Data

`oecs-registry`'s backend has no API yet, so the app runs against realistic fixture data behind a
`RegistryClient` interface (`src/lib/registry`). Swapping in a real backend later means adding an
implementation of that interface and changing the single export in `src/lib/registry/client.ts` —
no component code changes.

## Development

```sh
pnpm install
pnpm dev            # http://localhost:5173
pnpm lint
pnpm typecheck
pnpm build
```

## Docker

```sh
docker build -t oecs-registry-web .
docker run -p 8080:8080 oecs-registry-web
# or
docker compose up
```

Serves on port 8080 behind nginx; `/healthz` for health checks. `BACKEND_URL` (env var) configures
the `/api/` reverse proxy for when a real backend exists — inert until then.

# Home Dashboard

A single-page landing page for home automation, homelab, and network
bookmarks. Categories are laid out as columns (auto-collapsing to a single
column on mobile), and everything — categories, links, and their order — is
editable in place. There is no login; anyone on your network who can reach
the page can view and edit it.

## Features

- Responsive column layout (grid auto-fits from 1 column on phones up to 4+
  on wide desktop screens)
- Edit mode: add/rename/delete categories, add/edit/delete bookmarks
- Drag-and-drop reordering of both categories and bookmarks (including
  across columns), via `@dnd-kit`
- Settings (cog icon): edit the dashboard's title and subtitle
- Per-bookmark icon picker: search Material Design Icons and thousands of
  app/brand logos (Home Assistant, Proxmox, Philips Hue, pfSense, etc.) via
  the [Iconify](https://iconify.design) API, or paste any custom image URL.
  Falls back to an auto-fetched favicon, then a colored initial-letter
  avatar, if no icon is set.
- Widgets: a row above the categories for live data, reorderable like
  everything else. **+ Add widget** opens a searchable widget store with 18
  built-in integrations — Tempest weather, Home Assistant, Proxmox VE,
  Kubernetes/Rancher, AdGuard Home, UniFi Network, Pi-hole, Portainer, Plex,
  Jellyfin, Sonarr, Radarr, TrueNAS, Uptime Kuma, Enphase Solar, an on-demand
  internet speed test, Nextcloud, and a generic host/port ping monitor. Each
  is configured with a small connection form (host + credentials); more
  types can be added later by extending the registry in
  `src/lib/widgets/registry.ts` (see [Adding a widget type](#adding-a-widget-type)).
- Autosave (debounced) to a JSON file on disk — no database required
- `/api/healthz` for Kubernetes probes

Home Assistant *live entity* integrations (showing device/sensor state on a
card, not just an icon) are intentionally not built yet — the data model
and UI are structured so a "live status" badge per bookmark can be added
later without a rework.

Icon search and rendering call `api.iconify.design` directly from the
browser (no API key, CORS-enabled, no server-side proxy) — the dashboard
container needs outbound internet access for the icon picker and for any
bookmark that doesn't set a custom icon URL (auto-favicon fetch also hits
`google.com`). Icons already chosen and saved keep working offline since
the browser just re-requests the same public URL each render; there's no
local caching of icon bytes.

## Widgets

Edit mode → **+ Add widget** opens a store of 18 integrations. Picking one
opens a small config form: a base URL plus whatever credentials that
service needs (API key, username/password, or a token). Every widget also
gets a **Test connection** button before you save, so a typo doesn't just
silently fail later.

**Credentials never reach the browser.** Each widget's secret fields
(passwords, API keys, tokens) are stored server-side in the same
`dashboard.json` the rest of the dashboard uses, keyed by widget id — but
`GET /api/data` (what the browser loads) strips them out entirely, and the
config form only ever learns whether a field is *configured*, never its
value. All upstream API calls happen in server route handlers
(`src/app/api/widgets/[widgetId]/data`, `src/lib/integrations/*`), so a
credential only ever travels browser → server (when you type it in) and
server → the target service — never back out. Deleting a widget also
deletes its stored credentials. This still means credentials sit in
plaintext in `dashboard.json` on disk (same posture as everything else in
this login-free app) — keep the dashboard on a trusted network.

Most integrations hit each service's REST API directly and need a
same-network reachable host; several (Proxmox, UniFi, TrueNAS, Portainer,
Kubernetes) have an "Allow self-signed certificate" option since that's
the norm for local homelab HTTPS admin UIs. The **internet speed test**
widget is the one exception — it runs entirely in your browser against
Cloudflare's public speed-test endpoint, no credentials or server call
involved, and only runs when you click "Run test" (not on the usual
5-minute auto-refresh, so it doesn't burn bandwidth in the background).

**Tempest weather** gets a bespoke config screen instead of the generic
form, because picking a station benefits from a live dropdown: paste a
personal access token from
[tempestwx.com/settings/tokens](https://tempestwx.com/settings/tokens),
click **Load stations**, pick yours. You can also choose what the widget
shows (full details / current conditions only / forecast only) and how
many days of forecast to display.

### Adding a widget type

1. Add its config shape to the `Widget` union in `src/lib/types.ts` and a
   matching zod schema in `src/lib/schema.ts`.
2. Register it in `src/lib/widgets/registry.ts` — name, description, icon
   (an [Iconify](https://iconify.design) id), connection fields, and secret
   fields. This alone makes it show up in the widget store with a working
   generic config form.
3. Add a `fetch<Name>Data()` client in `src/lib/integrations/` and wire it
   into the `switch` in `src/lib/integrations/index.ts`.
4. Add a `<Name>Display.tsx` under `src/components/widgets/displays/` (the
   shared primitives in `src/components/widgets/primitives.tsx` cover most
   layouts) and register it in the `switch` in `src/components/WidgetCard.tsx`.

Only Tempest needs a bespoke config modal; everything else works from the
registry alone.

## Local development

```bash
npm install
npm run dev
```

Bookmark data is stored at `./data/dashboard.json` (created on first run,
gitignored). Delete it to reset to the seed example data in
[src/lib/store.ts](src/lib/store.ts).

## Configuration

| Env var    | Default          | Purpose                                  |
| ---------- | ---------------- | ----------------------------------------- |
| `DATA_DIR` | `<cwd>/data`     | Directory the JSON data file is stored in |
| `PORT`     | `3000`           | Port the server listens on                |

## Docker

```bash
docker build -t home-dashboard .
docker run -p 3000:3000 -v home-dashboard-data:/app/data home-dashboard
```

The `/app/data` volume is where `dashboard.json` lives — mount a volume
there or your edits won't survive a container restart.

## Deploying to Kubernetes (K3s)

Manifests are in [deploy/k8s](deploy/k8s) (namespace, PVC, Deployment,
Service, an example Ingress) and are kustomize-ready:

```bash
kubectl apply -k deploy/k8s
```

Before applying:

- Edit `deploy/k8s/pvc.yaml` if your cluster has no default `StorageClass`
  (e.g. set `storageClassName: local-path` for the K3s built-in one).
- Edit `deploy/k8s/ingress.yaml` (host / ingress class / TLS) or delete it
  and expose the Service however you normally do (LoadBalancer, Tailscale
  operator, etc).
- The Deployment runs a single replica with `strategy: Recreate`, since the
  bookmark data is a JSON file on a `ReadWriteOnce` volume — don't scale
  this beyond 1 replica.

### CI/CD

[.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)
builds and pushes the image to GHCR
(`ghcr.io/<your-github-username>/home-dashboard`) on every push to `main`,
tagged both `latest` and with the commit SHA. `deploy/k8s/deployment.yaml`
currently points at `ghcr.io/roach0816/home-dashboard:latest` with
`imagePullPolicy: Always` — the simplest setup is to have your cluster's
existing CD mechanism (Flux, ArgoCD, Watchtower, a `kubectl rollout
restart` cron, etc.) pick up new `latest` pushes. If your CD tool does
GitOps image promotion by SHA tag instead, point it at the `:<sha>` tag
this workflow also pushes.

Make the GHCR package public (or add an `imagePullSecrets` reference) so
your cluster can pull it without extra auth.

## Editing

Click **Edit** in the top right to enter edit mode:

- Drag the `⋮⋮` handle on a category header to reorder columns, or on a
  bookmark to reorder/move it between columns
- Click a category title to rename it inline
- **+ Add bookmark** / **+ Add category** to create new entries
- The pencil/trash icons on a bookmark edit or delete it
- **+ Add widget** opens the widget store; the pencil icon on a widget
  reopens its config, the trash icon removes it (and its stored credentials)

Changes autosave a moment after you stop editing; click **Done** when
finished.

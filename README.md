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
  everything else. **+ Add widget** opens a searchable widget store with 21
  built-in integrations — Tempest weather, Home Assistant, Proxmox VE,
  Kubernetes/Rancher, AdGuard Home, UniFi Network, Pi-hole, Portainer, Plex,
  Jellyfin, Sonarr, Radarr, TrueNAS, Uptime Kuma, Enphase Solar, an on-demand
  internet speed test, Nextcloud, a generic host/port ping monitor, a
  network printer toner/ink monitor (SNMP, works with most networked
  printers — Canon, Brother, HP, etc.), a Synology NAS storage monitor, and
  an HDHomeRun tuner monitor. Each is configured with a small connection
  form (host + credentials); more types can be added later by extending the
  registry in `src/lib/widgets/registry.ts` (see
  [Adding a widget type](#adding-a-widget-type)).
- Autosave (debounced) to a JSON file on disk — no database required
- `/api/healthz` for Kubernetes probes
- Favicon, `apple-touch-icon`, and a web app manifest (192px/512px icons) —
  the dashboard gets a proper icon in browser tabs and when added to a
  phone's home screen, not the default Next.js logo. Source SVG is
  [src/app/icon.svg](src/app/icon.svg); regenerate the PNGs from it if you
  change the design.

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

Edit mode → **+ Add widget** opens a store of 21 integrations. Picking one
opens a small config form: a base URL plus whatever credentials that
service needs (API key, username/password, or a token), plus a
**Refresh interval** in seconds (defaults to 60s for fast-changing data
like Proxmox/Kubernetes/Plex, 300s for the rest). The server refreshes
each widget's data in the background on that same interval and serves the
cached result instantly, so data is already there the moment you load or
switch back to the page — it never sits waiting on a live request, and a
transient fetch failure doesn't wipe out the last known-good data (only a
widget that's never successfully fetched shows an error). The
manually-triggered speed test is the one exception, since it measures your
own browser's connection. Every widget also gets a **Test connection**
button before you save, so a typo
doesn't just silently fail later, and every secret field has a show/hide
toggle so you can actually verify what you typed.

Every widget also has a **Card size** (Full or Half — half condenses the
display to fit a narrower card, so two fit where one did) and, for widgets
with a device/service behind them, a **Link card to device** checkbox that
makes the whole card open that device's URL in a new tab.

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

## Deploying via Rancher Continuous Delivery

This is the primary supported path: Rancher's Continuous Delivery
(built on [Fleet](https://fleet.rancher.io)) tracks
[deploy/k8s](deploy/k8s) in this repo and keeps the namespace, PVC,
Deployment, and Service in sync with `main`. The Ingress/hostname is
deliberately **not** part of that bundle (see step 4) — it's
cluster/environment config, not application code, so it isn't tracked in
git.

**1. Build the image.**
[.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)
already builds and pushes to `ghcr.io/roach0816/home-dashboard` on every
push to `main`, tagged `latest` and with the commit SHA — as a multi-arch
manifest (`linux/amd64` + `linux/arm64`), so it runs on both standard
x86 servers and ARM boards like a Raspberry Pi cluster. Nothing to do
here unless you forked the repo, in which case it'll publish to
`ghcr.io/<your-github-username>/home-dashboard` instead.

**2. Make the image pullable.** On the package's GitHub page: **Package
settings → Danger Zone → Change visibility → Public**. (Alternative: keep
it private and add an `imagePullSecrets` reference to
`deploy/k8s/deployment.yaml` instead.)

**3. Add the Git Repo in Rancher.** *Continuous Delivery → Git Repos → Add
Git Repo*:

| Field | Value |
| --- | --- |
| Repository URL | `https://github.com/roach0816/home-dashboard` |
| Branch | `main` |
| Paths | `deploy/k8s` |
| Target clusters | *(your environment — pick the cluster(s) to deploy to)* |

Fleet applies everything under `deploy/k8s` as a Kustomize bundle
(`deploy/k8s/fleet.yaml` is the bundle config) and re-syncs on every push
to `main` — no manual `kubectl apply` needed afterward. Confirm it landed:

```bash
kubectl get all -n home-dashboard
```

**4. Create the Ingress.** *(environment-specific — this is the part
that's genuinely yours to fill in: hostname, ingress class, and which
cert-manager `ClusterIssuer` you run.)* First check which ingress
controller your cluster actually runs — plain K3s defaults to `traefik`,
but plenty of clusters run `ingress-nginx` instead (or alongside it):

```bash
kubectl get ingressclass
```

**Use "Edit as YAML" from the start, not Rancher's guided form fields.**
The guided Ingress form has repeatedly produced broken results in
practice: it doesn't default **Path Type**, so Kubernetes rejects the
Ingress outright (`pathType: Required value: pathType must be
specified`) unless you explicitly pick `Prefix`; and separately, it can
silently save an Ingress with *no* `cert-manager.io/cluster-issuer`
annotation and *no* `tls:` block even when the fields looked filled in —
which doesn't error, it just quietly serves Traefik/nginx's default
self-signed "Fake Certificate" forever, since cert-manager never even
gets triggered. Skip the guided fields entirely: **Service Discovery →
Ingresses → Create → Edit as YAML**, and paste this in (swap
`ingressClassName` for whatever `kubectl get ingressclass` returned):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: home-dashboard
  namespace: home-dashboard
  annotations:
    cert-manager.io/cluster-issuer: <YOUR_CLUSTER_ISSUER>   # kubectl get clusterissuer
spec:
  ingressClassName: <YOUR_INGRESS_CLASS>   # kubectl get ingressclass — often "traefik" or "nginx"
  rules:
    - host: <YOUR_HOSTNAME>
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: home-dashboard
                port:
                  number: 80
  tls:
    - hosts: ["<YOUR_HOSTNAME>"]
      secretName: home-dashboard-tls
```

A filled-in-able copy of this also lives at
[deploy/k8s/ingress.example.yaml](deploy/k8s/ingress.example.yaml) — keep
your real version out of git (a local copy, or applied straight from
Rancher's UI, both work). `kubectl apply -f` works too if you'd rather
skip the Rancher UI for this step entirely.

**5. Point DNS at it — internally only.** This app has no login, so
`<YOUR_HOSTNAME>` should only resolve inside your network (a DNS override
in Pi-hole/AdGuard Home/your router pointed at the Ingress's address) —
don't port-forward 80/443 to it. If your `ClusterIssuer` uses a DNS-01
solver (Cloudflare, Route53, ...) rather than HTTP-01, certificate
issuance doesn't need the host to be publicly reachable at all, so this
works even though nothing about it is internet-facing.

**6. Verify the certificate actually issued.** Don't just trust that the
browser will stop complaining — confirm cert-manager did its job:

```bash
kubectl get ingress -n home-dashboard -o yaml   # confirm the annotation + tls: block really landed
kubectl get certificate -n home-dashboard -w    # watch until READY is True
kubectl describe certificate home-dashboard-tls -n home-dashboard
```

If `get certificate` returns nothing at all, cert-manager was never
triggered — that almost always means the annotation or `tls:` block
above didn't make it into the Ingress (see step 4). If a Certificate
*does* exist but sits at `READY: False`, dig into why the DNS-01
challenge is stuck:

```bash
kubectl get certificaterequest -n home-dashboard
kubectl get challenges -n home-dashboard
kubectl describe challenge <name> -n home-dashboard
```

**7. Updates roll out automatically — no manual restart needed.** The
Deployment is pinned to a commit SHA, not `:latest`. After
`docker-publish.yml` builds and pushes an image, it also rewrites
`deploy/k8s/deployment.yaml`'s image tag to that commit's SHA and commits
that change back to `main` (as `github-actions[bot]`, tagged `[skip ci]`
so it doesn't re-trigger itself). Fleet's normal polling (every ~1 minute)
picks up that manifest change like any other commit and rolls the
Deployment — because the YAML content actually changed this time, unlike
re-applying the same `:latest` string. If you ever need to force a
redeploy without a code change, `kubectl rollout restart
deployment/home-dashboard -n home-dashboard` still works.

### Other ways to deploy

Not using Rancher? The same manifests work with plain kubectl:

```bash
kubectl apply -k deploy/k8s
```

Steps 2, 4, 5, and 6 above still apply the same way — just skip the "Add
Git Repo" step and re-run `kubectl apply -k deploy/k8s` yourself after
each change (or wire up your own CD tool: Flux, ArgoCD, Watchtower, etc.
all work fine against this Kustomize bundle). Edit `deploy/k8s/pvc.yaml`
first if your cluster has no default `StorageClass` (K3s ships
`local-path` as the default, so this is usually a no-op). The Deployment
runs a single replica with `strategy: Recreate`, since the dashboard data
is a JSON file on a `ReadWriteOnce` volume — don't scale this beyond 1
replica.

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

# INSU on Azure Container Apps

Run the existing Next.js frontend and NestJS backend as separate **Consumption** apps. Keep MongoDB Atlas as the database, mount Azure Files for uploads, and run batch work as a finite daily job. Both apps keep one replica running so recruiter visits do not wait for an idle app to start. Minimum and maximum replicas are both 1; each app uses 0.25 vCPU and 0.5 GiB. This uses credit continuously: mostly idle compute for both apps is estimated at about $10/month after the shared monthly free grant, with activity and other services adding to that estimate. The user approved this tradeoff on 2026-10-25.

## Before provisioning

- Confirm Azure for Students is active, remaining credit, expiration, regional quota, and the allowed-region policy. Korea Central was permitted in the account inspected on 2026-10-25.
- Confirm the exact free-service meters in the subscription. The inspected account included 31 **Standard Registry Unit** days per month, 100 GB-month of Azure Files LRS data, and listed file-operation allowances through 2027-10-24. Those allowances do not make every registry/storage operation free; check the deployed SKU and actual usage.
- Include compute, registry, image builds, file operations, network traffic, logs, backups and jobs in the estimate. A $100 balance averages $8.33/month for twelve months or $16.67/month for six. Budget alerts do not stop consumption.
- Do not create Dedicated workload profiles, Premium storage, private endpoints, NAT gateways, SQL databases, or a paid subscription upgrade for this demo.
- Use a MongoDB user scoped to the separate `insu-demo` database. Preserve development/customer databases. Keep administrator credentials out of public demo accounts.

## Runtime commands

Build all deployment bundles with `npm ci && npm run build:deploy`. The Dockerfile performs this build and prunes development dependencies.

| Process | Container command |
| --- | --- |
| API | `node dist/apps/insu-api/main.js` |
| Daily batch | `node dist/apps/insu-batch/run-once.js` |
| Migration audit | `node dist/apps/insu-api/migrate-policy-purchase-open.js --check` |
| Migration apply | `node dist/apps/insu-api/migrate-policy-purchase-open.js --apply` |

The finite batch runner does not start the development Cron scheduler. It updates ranks and expires policies, then closes its database connection. A failed task stops the run and exits nonzero.

## Azure resources

Use a dedicated resource group such as `rg-insu-demo`, a Container Apps environment `insu-demo` with its built-in **Consumption** profile, one covered Standard container registry, and a StorageV2/Standard_LRS account with a small standard SMB file share. Begin with 0.25 vCPU/0.5 GiB per app/job and verify memory use under the real flow. Increase resources only after checking the budget impact.

1. Sign in using Azure CLI and explicitly select the inspected student subscription. Check `az account show` before mutations. Register `Microsoft.App`, `Microsoft.ContainerRegistry`, `Microsoft.Storage`, and `Microsoft.ManagedIdentity` as needed. Verify regional Container Apps CPU quota before creating the environment.
2. Create the environment with **`--environment-mode WorkloadProfiles`** and without unbounded log ingestion (`--logs-destination none` for the first pilot). Do not rely on the service default: the inspected API selected Express when the mode was omitted, and Express rejected Azure Files storage bindings. Verify `properties.environmentMode` is `WorkloadProfiles` and the only workload profile is `Consumption` before proceeding. Live log streaming is still available. Later diagnostics must have an explicit retention/cost decision.
3. Create one user-assigned identity `insu-image-pull`; grant it only `AcrPull` at this registry's scope. Use that identity in apps and jobs. Keep the registry admin account disabled. Allow propagation time before image pulls.
4. Create the SMB share and an environment storage definition named **`insu-uploads`**, access mode `ReadWrite`. The generated backend mounts it at `/app/uploads`. Follow Microsoft's supported SMB identity authentication if available; otherwise configure a storage-account key through a protected deployment input, without printing it or committing it. Do not disable secure transfer or use NFS for this setup.
5. Choose image tags tied to reviewed source commits. Build Linux/amd64 images and push privately. Prefer local Docker or an authorized GitHub build workflow. `az acr build` is an optional fallback only if this student subscription permits ACR Tasks; do not assume it does.

Azure-provided app hostnames are `https://insu-api.<environment-default-domain>` and `https://insu-web.<environment-default-domain>`. Read the actual `properties.defaultDomain` after creating the environment, then verify the final ingress FQDNs after app creation.

## Frontend build configuration

Build the sibling `insu-web` repository using its Dockerfile. Set these **build arguments** to the final public HTTPS URLs:

```text
NEXT_PUBLIC_GRAPHQL_URL=https://insu-api.<environment-default-domain>/graphql
NEXT_PUBLIC_API_URL=https://insu-api.<environment-default-domain>
NEXT_PUBLIC_SOCKET_URL=https://insu-api.<environment-default-domain>
NEXT_PUBLIC_SITE_URL=https://insu-web.<environment-default-domain>
```

Changing runtime environment variables does not rebuild Next.js public values. Never pass MongoDB credentials or signing keys as frontend build arguments. Socket.IO uses `/socket.io/` for transport and `/agent-chat` as its namespace.

For the existing AI adviser, optionally set both `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` in the private deployment input. The generator adds the key only as a backend secret, and the model as a backend setting. It never passes the key to the frontend or jobs. Keep the existing free model unless a paid model is deliberately approved. Without both settings, the application uses its existing recommendation fallback.

## Private deployment inputs

Copy `.env.example` to `.env.azure` in this directory and restrict it to the owner (`chmod 600 deploy/azure/.env.azure`). Set the real resource/image IDs, frontend origin, an Atlas URI ending in **`/insu-demo`**, and a new random signing key of at least 32 characters. A signing key can be generated locally with Node's `crypto.randomBytes(32).toString('hex')`; store it directly in the private input, not in logs/chat.

From the backend root with Node 22:

```bash
node --env-file=deploy/azure/.env.azure deploy/azure/render.mjs
```

This writes four JSON-formatted YAML documents under `.runtime/` (JSON is valid YAML). The directory is owner-only and files are mode 600. Both inputs and generated files are Git-ignored and excluded from Docker build context. Rendering refuses another database name, a non-HTTPS frontend origin, or an incomplete signing key. It never prints secret values. Treat generated manifests as secrets, and do not attach them to logs or reviews.

## First deployment order

1. Back up the chosen demo database if it contains data. Create the **manual** migration job from `.runtime/migration-job.yaml`; its default command is `--check`. Use `az containerapp job create --resource-group rg-insu-demo --name insu-migration --yaml <path>`, start it, and verify the execution **Succeeded**. A zero-conflict audit is required before continuing. Resolve duplicate purchases manually; never delete them automatically.
2. Explicitly update the migration job's arguments to `--apply`, run it once, and verify success before exposing the API. Ordinary web-container startup must not run this migration. Keep check/apply as separate reviewed actions, and put the manual job back to check mode afterward.
3. Create/update the backend and frontend apps from their generated YAML using `az containerapp create/update --resource-group rg-insu-demo --name <app-name> --yaml <path>`. API CORS must contain the actual frontend origin (`ALLOWED_ORIGINS`); health probes without an Origin header remain allowed. The backend's liveness route is `/health/live`, and readiness is `/health/ready` (503 when MongoDB is disconnected).
4. Verify image pulls, startup probes, HTTPS FQDNs, and upload mount before sharing the link. Use one active backend revision and at most one replica so private Socket.IO updates stay on the same process. Never introduce a second API replica without a shared Socket.IO adapter.
5. Create/update the scheduled job from `.runtime/batch-job.yaml`. Its cron expression is **`0 17 * * *` UTC**, equivalent to **02:00 Asia/Seoul** the next day. It has one replica, no automatic retries, and a five-minute timeout. Run once manually against demo data and inspect its status before relying on the schedule.

## Verification and operation

- Run `npm test -- --runInBand`, `node --test deploy/azure/render.test.mjs`, and `npm run build:deploy`; also run frontend tests and type checking. Verify the actual Docker images separately—local Node builds do not prove Docker startup.
- Test desktop/mobile login, packages, client and agent demo accounts, private messages, offers, acceptance, payment-receipt confirmation, and active policies. Use synthetic demo records only; no real insurance purchase or money transfer is performed.
- Upload an image, restart the backend revision, and verify the same image remains available. Test a cold visit after scale-to-zero and confirm Socket.IO reconnects without duplicating a purchase.
- Inspect failed jobs, memory pressure, file-share growth, and consumption. A public demo can receive bot traffic; replica limits reduce exposure but are not spending caps. Keep sample data/export files small and restrict upload abuse.
- Preserve `minReplicas: 1` for both apps through image updates and rollbacks. Use targeted `az containerapp update --name <app-name> --resource-group rg-insu-demo --min-replicas 1` when updating the live minimum so existing custom-domain bindings and CORS settings are retained. Keeping a replica running removes scale-from-zero delays; deployments, maintenance and failures can still restart a container.
- Retain a small number of tagged previous images. Roll back by updating app image tags and rebuilding frontend URLs only when endpoints change. Do not automatically restore or downgrade the database during image rollback.
- Keep account-role protections in every rollback image: public administrator registration and self-service role/status changes must remain blocked. The initial pilot backend image predates those protections; use the fixed image as the first safe baseline.
- Export the demo database and copy uploads to a separate recoverable destination; test restoring to an isolated database/share. Do not call a backup working until restore succeeds. Check Atlas inactivity notices; Free clusters may pause after extended inactivity.
- Reassess the first-year budget after a short pilot. Before free-service expiration, review the registry/storage meters and student-credit renewal or remove unneeded resources deliberately. Never silently upgrade to pay-as-you-go.

## Custom domain: insurance-ai.tech

The website uses `https://insurance-ai.tech` and `https://www.insurance-ai.tech`. The API retains its Azure-generated HTTPS endpoint; browser GraphQL, authentication and Socket.IO traffic are proxied through the website origin. Rebuild the frontend with `NEXT_PUBLIC_SITE_URL=https://insurance-ai.tech` so canonical and sharing URLs use the custom domain.

DNS at the registrar uses an apex A record pointing to the environment static IP, a direct `www` CNAME pointing to the frontend's generated FQDN, and ownership TXT records at `asuid` and `asuid.www`. Keep these records for Azure's free managed certificate validation and renewal. If a root CAA record is added, it must permit `digicert.com`. Complete the registrar's email verification separately.

After hostname binding, use targeted image updates (`az containerapp update --image ...`) so the existing certificate bindings are retained. The initial deployment generator does **not** include custom hostname bindings or multiple frontend origins. Before applying a regenerated full app manifest, copy the current `properties.configuration.ingress.customDomains` into the frontend manifest and set the backend's `ALLOWED_ORIGINS` to the following exact comma-separated list. Otherwise a full manifest can remove the domain bindings or restore the initial CORS configuration.

```text
https://insurance-ai.tech,https://www.insurance-ai.tech,https://insu-web.wonderfultree-0c4dc888.koreacentral.azurecontainerapps.io
```

Keep these settings through rollbacks. Verify HTTPS for both hostnames, HTTP-to-HTTPS redirects, CORS preflight and authenticated Socket.IO connections using each custom origin after deployment.

References: [Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing), [Azure Files mounts](https://learn.microsoft.com/en-us/azure/container-apps/storage-mounts-azure-files), [Jobs](https://learn.microsoft.com/en-us/azure/container-apps/jobs), [Managed identity image pulls](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull).

## Cookie authentication release (2026-11-02)

The browser uses `/api/graphql`, `/api/auth/*` and `/socket.io/` on the website origin. Next.js proxies these to the configured API. Preserve the Socket.IO trailing slash and disable automatic trailing-slash redirects so WebSocket upgrades are forwarded directly. The backend must retain all three allowed frontend origins listed above.

Production sessions use host-only `__Host-insu-session` cookies with HttpOnly, Secure and SameSite=Lax. A readable signed CSRF cookie must match the request header and the current session. Login and other mutations require CSRF protection. Never set `SESSION_COOKIE_SECURE=false` in Azure; that override is for local HTTP integration checks only.

JWTs contain minimal identity/session claims and expire after 12 hours. A matching hashed session record in `auth_sessions` is required; MongoDB TTL handles expired record cleanup, while request verification rejects expiry immediately. Logout deletes the record and closes its sockets. Password changes and role/status changes invalidate that member's existing sessions.

Legacy localStorage JWTs are deliberately rejected. Existing users need to sign in again after this release. The frontend removes the old storage value; no authentication token is returned by the GraphQL schema. Session restoration uses a no-store endpoint. Keep the existing strong signing key and database secrets private.

For subsequent releases, update app/job image tags only. Do not run the manual migration job for this cookie change. Keep one API replica until a shared Socket.IO adapter is introduced.

Dependency audit at this release found existing advisories outside the cookie migration. The compatible `proxy-addr` 2.0.8 patch removes its critical IP-spoofing advisory. The production-only audit still reports 17 high and 3 moderate advisories, including GraphQL/upload dependency chains; some suggested fixes require major Nest GraphQL/upload upgrades. Track and test those separately rather than using an unreviewed forced upgrade. This release is not a complete dependency-security clearance.

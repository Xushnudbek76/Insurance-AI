# Insurance AI Docker VPS Deployment

This project is split into two apps:

- backend: `insurance-ai` (NestJS GraphQL/API) on port `3007`
- frontend: `insu-web` (Next.js) on port `3000`

This Docker setup keeps both containers behind host Nginx on the VPS.

## Files added

- backend Dockerfile: `insurance-ai/Dockerfile`
- frontend Dockerfile: `insu-web/Dockerfile`
- compose file: `insurance-ai/deploy/docker-compose.yml`
- compose env example: `insurance-ai/deploy/.env.compose.example`

## VPS folder shape

Recommended:

```text
/root/apps/backend
/root/apps/frontend
```

With that layout, place the backend repo in `/root/apps/backend` and the frontend repo in `/root/apps/frontend`.

## Backend env

Create `/root/apps/backend/.env` with production values such as:

```env
PORT_API=3007
PORT_BATCH=3008
MONGO_DEV=your-mongodb-uri
OPENROUTER_API_KEY=replace-this
OPENROUTER_MODEL=arcee-ai/trinity-large-thinking:free
```

## Compose env

Create `/root/apps/backend/deploy/.env.compose` from the example and adjust the frontend path if needed:

```env
BACKEND_CONTEXT=..
FRONTEND_CONTEXT=../../frontend
BACKEND_ENV_FILE=../.env
BACKEND_PORT=3007
FRONTEND_PORT=3000
BACKEND_UPLOADS_DIR=../uploads

NEXT_PUBLIC_GRAPHQL_URL=https://insurance-ai.tech/graphql
NEXT_PUBLIC_SOCKET_URL=https://insurance-ai.tech
NEXT_PUBLIC_API_URL=https://insurance-ai.tech
NEXT_PUBLIC_SITE_URL=https://insurance-ai.tech
```

## Build and run

From `/root/apps/backend/deploy`:

```bash
docker compose --env-file .env.compose up -d --build
```

## Check containers

```bash
docker compose --env-file .env.compose ps
docker compose --env-file .env.compose logs -f backend
docker compose --env-file .env.compose logs -f frontend
```

## Nginx

Keep Nginx on the host and proxy:

- `/` -> `127.0.0.1:3000`
- `/graphql` -> `127.0.0.1:3007/graphql`
- `/uploads/` -> `127.0.0.1:3007/uploads/`
- `/socket.io/` -> `127.0.0.1:3007/socket.io/`

If you want one-origin API access through `/api`, add matching Nginx rewrites and build the frontend with those `/api` URLs instead.

## Updates

```bash
cd /root/apps/backend && git pull
cd /root/apps/frontend && git pull
cd /root/apps/backend/deploy
docker compose --env-file .env.compose up -d --build
```

## Important

- Next.js public env values are baked in at build time, so rebuild the frontend container after changing public URLs.
- Keep `/root/apps/backend/uploads` persistent.
- Rotate any secrets currently used in local development before public deployment.

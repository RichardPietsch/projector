# Resource Planner

Single-page React app with an Express + SQLite API for managing people, clients, projects, challenges, and assignments.

## Features
- Table-based views: **People**, **Clients**, **Projects**
- CRUD for all main entities
- One assignment per challenge (enforced with DB uniqueness)
- Automatic assignment quantity rebalance per person to sum to 100%
- JSON export/import of full app state
- Static lists for Priority, Trade, and Level

## Run locally (without Docker)
```bash
npm install
npm run dev
```
- Frontend: http://localhost:5173
- API: http://localhost:3001

## Run with Docker Desktop
Prerequisite: Docker Desktop is running.

### Option A: build from GitHub URL (recommended syntax)
If you build from a GitHub URL, use the **git URL format** (`.git`) and a branch/tag.

```bash
docker buildx build --load -t projector "https://github.com/RichardPietsch/projector.git#main"
```

If your Docker version does not support buildx URL syntax, clone first and build locally:

```bash
git clone https://github.com/RichardPietsch/projector.git
cd projector
docker build -t projector .
```

Run it:
```bash
docker run --rm -p 3001:3001 projector
```

Then open:
- App: http://localhost:3001
- API state endpoint: http://localhost:3001/api/state

### Option B: docker compose (separate API + web containers)
1. Build and start both containers:
   ```bash
   docker compose up --build
   ```
2. Open the app:
   - Frontend: http://localhost:5173
   - API state endpoint: http://localhost:3001/api/state
3. Stop containers:
   ```bash
   docker compose down
   ```

### If you still get `unknown instruction: <!DOCTYPE`
Docker is parsing an HTML file as a Dockerfile (not the repo Dockerfile). Use one of these fixes:

```bash
# A) clone + local build (most reliable)
git clone https://github.com/RichardPietsch/projector.git
cd projector
docker build -f Dockerfile -t projector .

# B) remote build with explicit dockerfile path (buildx)
docker buildx build --load -f /Dockerfile -t projector "https://github.com/RichardPietsch/projector.git#main"
```

Also verify the latest Dockerfile exists on GitHub before building.


### If startup fails around `better-sqlite3/lib/database.js:65`
This usually means native bindings were not built for your container image.

Use a clean rebuild without cache:
```bash
docker build --no-cache -t projector .
docker run --rm -p 3001:3001 projector
```

For compose:
```bash
docker compose build --no-cache
docker compose up
```

## Connect this project to your GitHub repository
From this project folder, run:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USER>/<YOUR_REPO>.git
git branch -M main
git push -u origin main
```

If `origin` already exists, update it:
```bash
git remote set-url origin https://github.com/<YOUR_GITHUB_USER>/<YOUR_REPO>.git
git push -u origin main
```

### Optional: Use GitHub Container Registry (GHCR)
If you want Docker images linked to your repo:

```bash
docker build -f Dockerfile.api -t ghcr.io/<YOUR_GITHUB_USER>/<YOUR_REPO>-api:latest .
docker build -f Dockerfile.web -t ghcr.io/<YOUR_GITHUB_USER>/<YOUR_REPO>-web:latest .

echo <GITHUB_PAT> | docker login ghcr.io -u <YOUR_GITHUB_USER> --password-stdin
docker push ghcr.io/<YOUR_GITHUB_USER>/<YOUR_REPO>-api:latest
docker push ghcr.io/<YOUR_GITHUB_USER>/<YOUR_REPO>-web:latest
```

## Data model notes
- `Project.client_id` is required.
- `Assignment.challenge_id` is unique (one person per challenge).
- Dates are stored as text in `YYYY.MM` format.
- Budgets are stored in euros (`budget_eur`).

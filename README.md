# Tip

Private single-user daily value bets dashboard built with Next.js, TypeScript, and MongoDB.

## Local setup

1. Create your local env file from the template:

```bash
cp .env.example .env.local
```

2. Fill in all required values:

- `TIP_ADMIN_PASSWORD`
- `MONGODB_DB_NAME`
- `MONGODB_PASSWORD` or `MONGODB_URI`

3. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login` and sign in with:

- username: `admin`
- password: the value you set in `TIP_ADMIN_PASSWORD`

Important:
- The app will not boot cleanly without `TIP_ADMIN_PASSWORD`.
- No real secrets should ever be committed.

## Environment variables

Required:

- `TIP_ADMIN_PASSWORD`
- `MONGODB_DB_NAME`
- `MONGODB_PASSWORD` or `MONGODB_URI`

Atlas example using password:

```bash
MONGODB_PASSWORD="your-atlas-password"
MONGODB_DB_NAME="tipdiaria"
```

Atlas example using full URI:

```bash
MONGODB_URI="mongodb+srv://mg023361_db_user:your-url-encoded-password@cluster0.x3s6ffm.mongodb.net/?appName=Cluster0"
MONGODB_DB_NAME="tipdiaria"
```

## Useful commands

```bash
npm test
npm run build
npm run pipeline:run
```

## GitHub repository setup

This app should live in its own private GitHub repository rooted at `tip`.

Suggested bootstrap:

```bash
cd tip
git init
git add .
git commit -m "Initial commit"
```

Before pushing:

- confirm `.env.local` is ignored
- confirm no real secrets appear in tracked files
- keep only `.env.example` in git
- create the GitHub repository as private

## Vercel deployment

Deploy the `tip` directory as its own Vercel project.

Set these environment variables in Vercel:

- `TIP_ADMIN_PASSWORD`
- `MONGODB_DB_NAME`
- `MONGODB_PASSWORD` or `MONGODB_URI`

Deployment model for v1:

- app hosted on Vercel
- MongoDB Atlas used for persistence
- pipeline remains manual-first through the admin UI and `/api/jobs/run`
- no Vercel Cron in this phase

## Safe push checklist

- `.env.local` is not tracked
- GitHub repo is private
- Vercel env vars are configured separately from git
- README and `.env.example` match the actual runtime requirements
- `npm test` passes
- `npm run build` passes

## Notes

- The app does not seed mock picks or sample candidates.
- Public source payloads can change, so the SoccerVista adapters may need maintenance over time.

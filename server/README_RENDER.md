Deploying the `ruya-gemini-server` to Render

Prereqs
- A Render account with billing enabled
- `git` access to this repository

Quick steps

1) Push your repo to a Git provider (GitHub/GitLab/Bitbucket) and connect it to Render.

2) Create a new Web Service on Render and choose "Connect a repository" OR use the Render Dashboard "New -> Web Service" and select the repo and branch.

3) On the Render service settings:
   - Environment: Docker
   - Dockerfile Path: `Dockerfile` (root of `server/` folder)
   - Start Command: `npm start`
   - Port: leave default (we expose 3001 in the container)

4) Add secrets (in Render Dashboard -> Environment -> Add Secret):
   - `GEMINI_API_KEY` — your Gemini image API key
   - `GEMINI_IMAGE_URL` — optional endpoint URL for Gemini (if using a proxy or testing)

5) Deploy and monitor logs in Render. The service will get a public HTTPS URL like `https://ruya-gemini-server.onrender.com`.

Notes & best practices
- Keep API keys out of the repo; use Render Secrets.
- For images: prefer uploading generated images to an object store (S3/GCS) and serve via CDN instead of writing to local disk.
- Configure rate-limiting / authentication to avoid abuse.

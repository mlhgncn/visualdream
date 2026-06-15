# Ruya Gemini App

Repo contains an Expo React Native client and a Node.js/Express server for generating images.

Structure
- `client/` — Expo React Native app (mobile)
- `server/` — Node.js Express API

Quick start (local)

1. Install dependencies

```bash
# server
cd server
npm install

# client
cd ../client
npm install
```

2. Run server

```bash
cd server
npm start
```

3. Run client (Expo)

```bash
cd client
npx expo start
```

Deployment notes
- A `server/Dockerfile` and `server/render.yaml` are included for deploy to Render or other Docker hosts.
- Do NOT commit secrets. Put `GEMINI_API_KEY` into your hosting provider's secret manager.
- In production, use cloud storage (S3/GCS) for generated images instead of local `server/public`.

Next steps to push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: client + server + deploy configs"
# add remote and push (replace URL)
git remote add origin https://github.com/YOUR_USER/visualdream.git
git branch -M main
git push -u origin main
```
ruya-gemini-app

Quick scaffold: Expo client + Express proxy to Gemini image API.

Setup

1) Server (proxy to Gemini)

- Copy and edit `.env.example` to `.env` and fill GEMINI_IMAGE_API_KEY and GEMINI_IMAGE_URL.

```powershell
cd ruya-gemini-app\server
copy .env.example .env
notepad .env
npm install
npm run start
```

2) Client (Expo)

```powershell
cd ruya-gemini-app\client
npm install
# Start Expo dev server
npx expo start
```

Workflow
- Open the app on device/emulator, enter your dream, press "Rüyanı Gönder".
- Client posts to the server `/api/generate-image` which forwards to Gemini; server returns `imageDataUrl` or `imageUrl`.

Notes
- Keep Gemini keys on the server (`.env`), do not embed in the client.
- This scaffold focuses on a mystical UI; customize styles in `client/screens/*`.

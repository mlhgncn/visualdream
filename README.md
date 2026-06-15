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

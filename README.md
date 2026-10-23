# ConerZone AI Movie Recap Studio

Mobile-friendly React + Vite frontend and Node.js/Express backend. AI integrations are limited to **Groq API and Gemini API**. FFmpeg is a non-AI video-processing dependency.

## Features
- Local video upload and direct public video URL import
- Video preview and draggable subtitle overlay
- Groq recap-script generation from user-provided title/plot notes
- Gemini subtitle proofreading
- Editable subtitle rows and SRT download
- FFmpeg MP4 subtitle burn-in endpoint
- API keys remain server-side

## Run locally
Requirements: Node.js 20+, npm, FFmpeg with subtitles/libass support, and a Myanmar font such as Noto Sans Myanmar.

1. Copy server/.env.example to server/.env and set GROQ_API_KEY and GEMINI_API_KEY.
2. Run npm install at repository root.
3. Run npm --prefix server install and npm --prefix client install.
4. Run npm run dev.
5. Open the Vite URL (normally http://localhost:5173). Backend API listens on port 8787.

## Deployment
The Vercel config builds the static frontend from client/dist. Deploy the Node backend separately to a persistent Node host with FFmpeg and Myanmar font installed. Set VITE_API_BASE in the frontend deployment to the backend's public HTTPS URL, and set CLIENT_ORIGIN on the backend to the exact frontend origin. Vercel's static frontend deployment does not run the FFmpeg backend.

## Environment and security
- Keep server/.env private; never commit API keys or place them in client/.env.
- client/.env.example contains only VITE_API_BASE.
- URL import accepts direct public video file URLs only. It does not download arbitrary streaming pages such as YouTube pages. Import only videos you own or are authorized to process.
- Protect the backend with authentication, rate limits, storage cleanup, and HTTPS before public production use. The starter is not production-hardened.
- This app does not automatically transcribe a full movie or inspect video content with AI. The recap writer uses the title and notes supplied by the user.

# ConerZone Burmese Voice + MP4 backend

## Render deployment (Android-friendly)

1. Open Render and choose New > Web Service.
2. Connect Kajonvip/ConerZone.
3. Set Root Directory to server.
4. Set Runtime to Docker (Render will use server/Dockerfile).
5. Set environment variables:
   - CLIENT_ORIGIN = https://coner-zone.vercel.app
   - MAX_UPLOAD_MB = 500
   - GROQ_API_KEY and GEMINI_API_KEY only if using server-side AI routes.
6. Deploy and open https://YOUR-BACKEND.onrender.com/api/health. It should return JSON with ok: true.
7. In Vercel, open the ConerZone project > Settings > Environment Variables. Add VITE_API_BASE = the backend URL, without a trailing slash. Redeploy the frontend.
8. Test with a short MP4 (H.264/AAC) first. Choose male or female voice, then click Generate Final MP4 (Burmese Voice).

## Important

- The TTS endpoint uses the online Microsoft Edge TTS service through the edge-tts Python package, with my-MM-ThihaNeural (male) and my-MM-NilarNeural (female). This is not an official Microsoft paid API and availability can change. Do not use it for guaranteed production uptime without a supported TTS provider.
- FFmpeg is installed in the Docker image. Noto fonts are included for Burmese subtitles.
- The first test should be a short clip. Rendering uses CPU and can take time. Large uploads can exhaust memory/storage or exceed the hosting plan's limits.
- This MVP loops the source video while narration audio plays, so a short source clip can cover a longer voice-over. It does not yet select matching scenes automatically or synchronize each subtitle line to spoken words; edit SRT timing before export.
- Uploaded and generated files currently live in the container filesystem. They may be deleted after a restart/redeploy unless a persistent disk is attached. For public use, add authentication, rate limiting, file cleanup and storage limits.
- Never put Groq/Gemini server keys in the frontend environment. Vite VITE_* variables are public.
- URL import only supports direct public downloadable video-file URLs; arbitrary streaming pages are not supported.

# Android phone setup

1. Open the repository in GitHub and confirm the new files are present.
2. Use a browser-based cloud development environment such as GitHub Codespaces (if available to your account).
3. In terminal, run npm install, npm --prefix server install, and npm --prefix client install.
4. Copy server/.env.example to server/.env and add API keys privately.
5. Run npm run dev and open the forwarded client port (5173).
6. For deployment, deploy the client to Vercel and the server to a Node host with FFmpeg installed. Configure VITE_API_BASE and CLIENT_ORIGIN.

Never paste API keys into public GitHub files or screenshots. Video URL import supports direct downloadable files, not streaming pages. MP4 export requires FFmpeg and a Myanmar font on the backend.

## About

In-Between is the web frontend for a real-time multiplayer card game. Players create or join a room with a short code, then take turns betting whether the next card lands higher, lower, or between their two dealt cards. The frontend never decides game logic. It sends player actions to the server over a WebSocket and renders whatever state the server broadcasts back.

**Live:** https://your-app.vercel.app

Many thanks to my better half, Elijah, for doing this project with me: 

**Backend repo:** https://github.com/jijahh/in-between

## Tech Stack

- **React 18**: UI, built from small function components
- **Vite**: dev server and production build
- **WebSocket API + fetch**: native browser APIs, no client library, for real-time game events and room creation
- **Plain CSS with custom properties**: every color, font and radius is a token in `src/theme.css`, so re-theming is a one-file change
- **Inter and Nuosu SIL**: sans-serif for UI, serif for display text
- **Vercel**: frontend hosting
- **FastAPI on Render**: backend (separate repo)

## Project Structure

    src/
    ├── App.jsx        # screens: Home, Lobby, Table
    ├── useGame.js     # WebSocket connection + event reducer
    ├── api.js         # REST helpers + WebSocket URL
    ├── theme.css      # design tokens (colors, fonts, shape)
    ├── styles.css     # layout and components
    └── main.jsx

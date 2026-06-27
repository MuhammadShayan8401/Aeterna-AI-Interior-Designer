# Aeterna — AI Interior Designer

A premium React frontend for the AI Interior Design pipeline built with Vite, Tailwind CSS, and Framer Motion.

## Stack

| Layer | Library |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS v3 |
| Animation | Framer Motion |
| HTTP | Axios |
| Notifications | React Hot Toast |

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set your API URL
cp .env.example .env
# Edit .env and set VITE_API_URL to your Cloudflare tunnel URL

# 3. Start dev server
npm run dev
```

## Environment Variables

```env
VITE_API_URL=https://your-tunnel-url.trycloudflare.com
```

## Build for Production

```bash
npm run build
# Output is in /dist
```

## Backend Endpoints Expected

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Returns `{ gpu, device }` |
| POST | `/generate` | Multipart form: `image, room_type, style, density, num_images, strength` |
| POST | `/feedback` | JSON: `{ session_id, image_index, rating, seed, style, room_type }` |
| GET | `/feedback/summary` | Returns `{ total, like_rate_pct, by_style }` |

## Project Structure

```
src/
  components/
    Sidebar.jsx          # Control panel + settings
    HeroSection.jsx      # Animated hero
    UploadPanel.jsx      # Drag & drop upload
    LoadingOverlay.jsx   # Pipeline progress modal
    ResultGrid.jsx       # Generated images layout
    ResultCard.jsx       # Single image + lightbox + feedback
    FeedbackButtons.jsx  # Like/dislike
    PromptViewer.jsx     # Expandable prompt display
    PipelineInternals.jsx# Seg mask + depth map debug panel
    HealthStatus.jsx     # API connection checker
  services/
    api.js              # Axios API layer
  utils/
    constants.js        # Room types, styles, pipeline steps
  App.jsx               # Root layout + state
  main.jsx              # Entry point
  index.css             # Tailwind + global styles
```

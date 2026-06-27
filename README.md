# Aeterna AI Interior Designer

> **Final Year Deep Learning Project — Sir Syed University of Engineering & Technology, Karachi**

A full-stack AI platform that redesigns interior spaces using a four-stage deep learning pipeline. Upload a room photo for AI-powered redesign, or generate a space entirely from scratch using text prompts. Features adaptive preference learning that improves with your feedback.

---

## Live Demo

The original Streamlit prototype is available at:
[ai-interior-designer-eurhnj66zzjm4zzhxuggkh.streamlit.app](https://ai-interior-designer-eurhnj66zzjm4zzhxuggkh.streamlit.app/)

The v2 React frontend runs locally against the Colab-hosted backend (see Quick Start below).

---

## What's in v2

| Area | v1 (Streamlit) | v2 (React + FastAPI) |
|---|---|---|
| Frontend | Streamlit prototype | React 18 + Vite, editorial design |
| Auth | None | JWT (access + refresh tokens), user + admin roles |
| Database | JSON files | MongoDB Atlas (Motor async driver) |
| History | None | Full paginated history, favorites, regenerate |
| Dashboard | Basic analytics | Personal stats, style affinity, activity feed |
| Admin panel | None | Platform metrics, model health, ANN retrain controls |
| Empty Room | None | Text-to-interior generation (no photo needed) |
| Pricing page | None | Free / Pro / Studio plans with comparison table |
| ANN | Basic feedback file | 5-head MLP trained on user feedback, persists to Drive |

---

## AI Pipeline

```
Room Photo  ──────────────────────────────────────────────────────────►
              Stage 1        Stage 2       Stage 3          Stage 4
           ┌──────────┐  ┌──────────┐  ┌──────────┐   ┌─────────────┐
           │SegFormer │→ │  MiDaS   │→ │   ANN    │→  │  Stable     │
           │Semantic  │  │  Depth   │  │Preference│   │  Diffusion  │
           │Segment.  │  │  Estim.  │  │  Engine  │   │   v1.5      │
           └──────────┘  └──────────┘  └──────────┘   └─────────────┘
           ADE20K 150    Relative      32-dim input    DPM-Solver++
           classes       depth map     5 output heads  30 steps
                                                       CFG 7.5
                                                            │
                                                            ▼
                                                   Ranked design outputs

Text Prompt ──────────────────────────────────────────────────────────►
                                                    Stage 3          Stage 4
                                                 ┌──────────┐   ┌─────────────┐
                                                 │   ANN    │→  │  Stable     │
                                                 │Preference│   │  Diffusion  │
                                                 │  Engine  │   │  txt2img    │
                                                 └──────────┘   └─────────────┘
                                                                Empty room result
```

### Model details

| Stage | Model | Source | Task |
|---|---|---|---|
| 1 | SegFormer-B2 | `nvidia/segformer-b2-finetuned-ade-512-512` | Pixel-level scene segmentation (150 ADE20K classes) |
| 2 | MiDaS DPT-Large | `intel-isl/MiDaS` | Monocular relative depth estimation |
| 3 | Preference ANN | Custom 5-head MLP (32-dim input) | Style, density, strength, satisfaction, aesthetic score prediction |
| 4 | Stable Diffusion v1.5 | `runwayml/stable-diffusion-v1-5` | img2img redesign + txt2img empty room generation |

The **Preference ANN** is a 3-layer MLP with LayerNorm and 5 output heads. It encodes room type, style, density, lighting, and past rating signals into a 32-dimensional feature vector and trains continuously from user like/dislike feedback. The model is saved to `backend/checkpoints/ann_preference.pth` and persists across Colab sessions.

---

## Tech Stack

**Frontend**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-11-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8)

**Backend**

![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10-3776AB?logo=python&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch&logoColor=white)

**Database & Auth**

![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens)

**AI / ML**

![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?logo=huggingface&logoColor=black)
![Diffusers](https://img.shields.io/badge/Diffusers-0.27-pink)
![Status](https://img.shields.io/badge/Status-Active-2F6F57)

---

## Project Structure

```
Aeterna AI/
│
├── backend/                          FastAPI application
│   ├── app.py                        Entry point, startup events, CORS
│   ├── .env                          MongoDB URI, JWT secret, admin key
│   │
│   ├── core/
│   │   ├── config.py                 Environment-driven settings (pydantic)
│   │   ├── security.py               JWT creation/decode, bcrypt hashing
│   │   └── deps.py                   FastAPI dependency injection (current user)
│   │
│   ├── database/
│   │   ├── mongo.py                  Async Motor client, collection accessors
│   │   ├── schemas.py                Pydantic request/response models
│   │   └── persistence.py            Generation record save/load helpers
│   │
│   ├── models/                       AI model loaders (one instance per process)
│   │   ├── segmentation.py           SegFormer loader + inference
│   │   ├── depth.py                  MiDaS loader + inference
│   │   ├── diffusion.py              Stable Diffusion loader + img2img/txt2img
│   │   ├── prompts.py                Automatic prompt engineering
│   │   └── ann/
│   │       └── preference_model.py   5-head MLP, training, inference
│   │
│   ├── routes/                       FastAPI routers
│   │   ├── generate.py               POST /generate (redesign)
│   │   ├── empty_room.py             POST /generate/empty-room
│   │   ├── history.py                GET/PATCH/DELETE /history
│   │   ├── dashboard.py              GET /dashboard/me + admin overview
│   │   ├── feedback.py               POST /feedback, ANN train, analytics
│   │   ├── ann_metrics.py            GET /ann/status
│   │   └── auth.py                   POST /auth/register, login, admin
│   │
│   ├── services/
│   │   ├── generation_service.py     Shared pipeline logic (redesign + empty room)
│   │   ├── recommendation_engine.py  ANN inference wrapper
│   │   └── analytics.py              Usage stats aggregation
│   │
│   ├── utils/
│   │   └── image_utils.py            Image I/O, resizing, base64 helpers
│   │
│   ├── uploads/                      Generated images + feedback.json
│   └── checkpoints/                  ann_preference.pth (ANN weights)
│
├── frontend/
│   └── interior-ai/                  React + Vite application
│       ├── src/
│       │   ├── main.jsx              Router setup (React Router v6)
│       │   ├── App.jsx               Home page (/)
│       │   ├── index.css             Design tokens, typography, component classes
│       │   │
│       │   ├── pages/
│       │   │   ├── AuthPage.jsx      /login · /register  (split-screen editorial)
│       │   │   ├── UserDashboard.jsx /dashboard          (account overview + stats)
│       │   │   ├── HistoryPage.jsx   /history            (masonry grid + filters)
│       │   │   ├── AdminDashboard.jsx /admin             (platform metrics + ANN controls)
│       │   │   ├── EmptyRoomDesigner.jsx /design-room   (7-step wizard + image redesign)
│       │   │   ├── PricingPage.jsx   /pricing            (comparison table + FAQ)
│       │   │   └── AboutPage.jsx     /about              (pipeline, tech stack, roadmap)
│       │   │
│       │   ├── components/
│       │   │   ├── PublicNav.jsx     Sticky navbar (all public pages)
│       │   │   ├── PublicLayout.jsx  Nav + footer wrapper for public pages
│       │   │   ├── AccountLayout.jsx Authenticated pages (Dashboard · History tabs)
│       │   │   ├── Footer.jsx        Site footer with nav links
│       │   │   ├── GenerationWorkspace.jsx  Full redesign UI (upload + controls + results)
│       │   │   ├── shared/PageShell.jsx     Sidebar layout (Admin only)
│       │   │   └── landing/          Landing page section components
│       │   │       ├── LandingHero.jsx
│       │   │       ├── LandingFeatures.jsx
│       │   │       ├── LandingBeforeAfter.jsx
│       │   │       ├── LandingHowItWorks.jsx
│       │   │       ├── LandingStyleGallery.jsx
│       │   │       ├── PhotoFrame.jsx       Real Unsplash interior photos
│       │   │       └── WorkspaceStylePicker.jsx
│       │   │
│       │   ├── context/
│       │   │   └── AuthContext.jsx   JWT auth state, login/register/logout
│       │   │
│       │   └── services/
│       │       └── api.js            Axios client, all API call functions
│       │
│       ├── .env                      VITE_API_URL (set per session from Colab)
│       └── package.json
│
├── colab_runner.ipynb                Google Colab notebook (run the backend)
└── README.md
```

---

## Quick Start

### Step 1 — Run the Backend (Google Colab)

The AI models require a GPU. Google Colab provides a free T4.

1. Open [Google Colab](https://colab.research.google.com)
2. Upload `colab_runner.ipynb` from this project
3. Set the runtime: **Runtime → Change runtime type → T4 GPU**
4. Upload the `Aeterna AI/` folder to Google Drive (`My Drive/Aeterna AI/`)
5. Run all cells top-to-bottom
6. **Cell 5** will print a public URL:

```
PUBLIC URL → https://xxxx-xxxx.trycloudflare.com
```

7. First-time only — run **Cell 6** to create your admin account

---

### Step 2 — Configure the Frontend

Create `frontend/interior-ai/.env`:

```dotenv
VITE_API_URL=https://xxxx-xxxx.trycloudflare.com
```

Replace the URL with the one printed by Cell 5. This changes every Colab session.

---

### Step 3 — Run the Frontend

```bash
cd frontend/interior-ai
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### MongoDB Atlas Setup (one-time)

The database and auth features require MongoDB Atlas:

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Go to **Network Access → Add IP Address → Allow from anywhere** (`0.0.0.0/0`)  
   *(Colab IPs change every session, so you must allow all IPs)*
3. The connection string is already set in `backend/.env`

---

## API Reference

Base URL: `https://xxxx-xxxx.trycloudflare.com` (from Colab tunnel)  
Interactive docs: `{BASE_URL}/docs`

### Authentication — `/auth`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create user account |
| `POST` | `/auth/login` | Login → `access_token` + `refresh_token` |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET`  | `/auth/me` | Current user profile |
| `PATCH`| `/auth/me` | Update profile or preferences |
| `POST` | `/auth/admin/bootstrap` | Create first admin account *(once only)* |
| `POST` | `/auth/admin/login` | Admin login |
| `GET`  | `/auth/admin/me` | Current admin profile |

### Generation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate` | Upload photo → AI redesign (full 4-stage pipeline) |
| `POST` | `/generate/empty-room` | Text prompt → new interior (txt2img, no photo needed) |

**`POST /generate` form fields:**  
`image` (file), `style`, `density` (minimal/moderate/dense), `lighting`, `strength` (0.0–1.0), `room_type`, `use_ann` (bool)

**`POST /generate/empty-room` form fields:**  
`room_type`, `style`, `prompt`, `lighting`, `density`, `strength`, `color_preference`, `budget`

### History

| Method | Endpoint | Description |
|---|---|---|
| `GET`    | `/history` | Paginated history (`skip`, `limit`, `favorites_only`, `generation_type`) |
| `GET`    | `/history/{id}` | Single generation record |
| `PATCH`  | `/history/{id}/favorite` | Toggle favourite |
| `DELETE` | `/history/{id}` | Permanent delete |
| `POST`   | `/history/{id}/regenerate` | Re-run with optional style/density/lighting overrides |

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| `GET`  | `/dashboard/me` | Personal stats, style affinity, recent activity feed |
| `GET`  | `/dashboard/admin/overview` | Platform metrics — users, generations, ANN status *(admin token required)* |
| `POST` | `/dashboard/admin/retrain` | Trigger ANN retrain in background *(admin only)* |

### Feedback & ANN

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/feedback` | Submit rating (`generation_id`, `rating`: 1 or -1) |
| `GET`  | `/feedback/summary` | Aggregated like/dislike analytics |
| `GET`  | `/feedback/analytics` | Detailed preference breakdown |
| `GET`  | `/feedback/recommend` | ANN-based style recommendation for current session |
| `POST` | `/feedback/train` | Manual ANN retrain (`epochs`, `lr`) |
| `GET`  | `/feedback/ann-status` | ANN checkpoint metadata + readiness |
| `POST` | `/feedback/rank` | Rank a list of generation candidates by ANN preference score |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | GPU availability, DB status, pipeline version |
| `GET` | `/docs` | Interactive Swagger UI |
| `GET` | `/ann/status` | Shorthand for ANN checkpoint info |

---

## Design Styles

The platform supports seven interior design styles across both redesign and empty-room modes:

| Style | Character |
|---|---|
| **Modern** | Clean geometry, neutral palette, concrete and glass |
| **Scandinavian** | Oak, linen, diffuse light — hygge as architecture |
| **Japandi** | Wabi-sabi + Scandinavian restraint, low profiles, natural fibre |
| **Minimalist** | Only what survives rigorous editing |
| **Luxury** | Marble, walnut, velvet — texture over status |
| **Industrial** | Exposed structure, reclaimed materials, honest imperfection |
| **Contemporary** | Curved forms, warm neutrals, a dark anchor |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Home | Landing page with hero, features, before/after slider, style gallery, generation workspace |
| `/login` `/register` | Auth | Split-screen editorial layout — interior photo left, form right |
| `/design-room` | Design Studio | Image redesign + 7-step empty room wizard (tabbed) |
| `/dashboard` | Account Dashboard | Usage stats, style affinity bars, activity feed, recent projects |
| `/history` | History | Masonry grid with search, filters, hover actions (download, redo, delete) |
| `/pricing` | Pricing | Free / Pro / Studio plans with 15+ feature comparison table |
| `/about` | About | Mission, full pipeline breakdown, tech stack, quarterly roadmap |
| `/admin` | Admin Panel | Platform metrics, model health, ANN readiness, retrain controls |

---

## Best Practices

- Use bright, evenly-lit room photos with a clear view of walls and floor
- Optimal transformation strength: **0.55 – 0.70** (lower = closer to original)
- Living rooms and bedrooms produce the most coherent results
- Rate generated designs — the ANN learns your preferences after ~10 ratings
- Run Cell 7 in the notebook (or use the Admin Dashboard) to retrain after collecting feedback

---

## Limitations

- Colab free tier disconnects after ~90 minutes idle — re-run from Cell 4 to restart
- The Cloudflare tunnel URL changes every session — update `VITE_API_URL` each time
- First generation takes ~60 seconds while Stable Diffusion loads into VRAM
- Free T4 GPU has 15 GB VRAM — avoid running other GPU notebooks simultaneously
- MongoDB auth features require an Atlas cluster (free tier available)

---

## Author

**Muhammad Shayan Ahmed**  
AI + Full Stack Developer · Software Engineering Student  
Sir Syed University of Engineering & Technology, Karachi

---

## Acknowledgements

- [HuggingFace Diffusers](https://github.com/huggingface/diffusers) — Stable Diffusion pipeline
- [NVIDIA SegFormer](https://huggingface.co/nvidia/segformer-b2-finetuned-ade-512-512) — Semantic segmentation
- [Intel MiDaS](https://github.com/isl-org/MiDaS) — Depth estimation
- [runwayml/stable-diffusion-v1-5](https://huggingface.co/runwayml/stable-diffusion-v1-5) — Image generation
- [Unsplash](https://unsplash.com) — Editorial interior photography used in the frontend

---

*⭐ If this project helped you, give it a star on GitHub.*

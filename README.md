# TravelBetter

AI-powered travel planning app to help you discover and organize your perfect trip.

## Features

- AI-powered place suggestions based on your preferences
- Extract travel places from URLs (YouTube, Instagram, TikTok, etc.)
- Extract travel places from images and screenshot batches (OCR)
- Trip planning and itinerary management
- Drag-and-drop itinerary editing with explicit save/discard flow
- Manual vs AI-assisted day placement before adding AI suggestions
- Standardized trip cards with route deep-links, commute context, and review snippets
- User authentication via Supabase

## Release Notes

### 2026-02-08 - Feature `006-itinerary-editing-ocr`

- Added robust itinerary edit mode with within-day and cross-day drag support, plus explicit save/discard behavior.
- Updated suggestion flow to checklist selection with required manual or AI-assisted placement confirmation before commit.
- Standardized trip/stop cards with timing controls, commute details, marker-to-card focus, and map route actions.
- Added multi-image screenshot OCR import with per-image status, editable extracted-text review, and retry/manual fallback recovery.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack React Query
- **Routing**: React Router v6
- **Database & Auth**: Supabase (PostgreSQL, Auth)
- **API**: Vercel Serverless Functions
- **AI**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18+ (recommended to install via [nvm](https://github.com/nvm-sh/nvm))
- npm or bun

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd TravelBetter

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Environment Variables

Create a `.env` file in the root directory for local development:

```env
# Supabase (for database and auth)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Google AI (for serverless functions - used in production via Vercel env vars)
GOOGLE_API_KEY=your_google_api_key
GEMINI_MODEL=gemini-3-flash-preview
GOOGLE_API_KEY_TEXT_EXTRACT=your_google_api_key
# Optional override for OCR/text extraction routes. Keep this the same as
# GEMINI_MODEL (or leave it unset) if you want one model everywhere.
GEMINI_TEXT_EXT_MODEL=gemini-3-flash-preview

# Google Places/Geocoding (restrict keys to required APIs)
GOOGLE_PLACES_API_KEY=your_google_places_key
GOOGLE_GEOCODING_API_KEY=your_google_geocoding_key
```

### Gemini Model Selection

This hackathon requires `gemini-3-flash-preview`. We use that model by setting
`GEMINI_MODEL=gemini-3-flash-preview` in `.env` (and in Vercel environment variables
for deployed environments).

How model resolution works in this codebase:

1. Most AI routes call `getGeminiUrl(...)` in `server/api/_shared/gemini.ts`.
2. `getGeminiUrl(...)` reads the model from `getGeminiModel()` in this order:
   - `GEMINI_MODEL`
   - `GOOGLE_GEMINI_MODEL`
   - fallback default: `gemini-2.0-flash`
3. OCR/text extraction routes (`/api/extract-places-from-text` and `/api/screenshot-extract`)
   can override this by using `GEMINI_TEXT_EXT_MODEL`. If that variable is set, those
   routes call `getGeminiUrlWithModel(...)` with that value; otherwise they fall back to
   the primary `GEMINI_MODEL` flow above.

If you need strict single-model compliance across all Gemini calls, set
`GEMINI_TEXT_EXT_MODEL=gemini-3-flash-preview` (or leave it unset so it falls back to
`GEMINI_MODEL`).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Engineering Quality Gates

- All code changes must pass linting, type checks, and automated tests before merge
- User-facing changes must keep UI patterns consistent and define loading/empty/success/error states
- Features must include measurable performance targets for primary user journeys
- Governance and standards are defined in `.specify/memory/constitution.md`

## Deployment on Vercel

This app is designed to be deployed on Vercel with both frontend and API functions.

### 1. Connect to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Vercel will auto-detect the Vite framework

### 2. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key |
| `GOOGLE_API_KEY` | Your Google AI API key (for Gemini) |
| `GEMINI_MODEL` | Primary Gemini model name (set to `gemini-3-flash-preview` for hackathon) |
| `GOOGLE_API_KEY_TEXT_EXTRACT` | Optional key override for text extraction (fallbacks to `GOOGLE_API_KEY`) |
| `GEMINI_TEXT_EXT_MODEL` | Optional model override for text extraction routes (fallbacks to `GEMINI_MODEL`) |
| `GOOGLE_PLACES_API_KEY` | Optional Places API key (Autocomplete/Text Search) |
| `GOOGLE_GEOCODING_API_KEY` | Optional Geocoding API key (fallbacks to `GOOGLE_API_KEY`) |

### 3. Deploy

Click "Deploy" - Vercel will:
- Build the React frontend
- Deploy a single catch-all serverless function at `/api/[...route]`
- Route `/api/*` endpoints through the internal API router

### API Routes

The following serverless functions are available:

| Endpoint | Description |
|----------|-------------|
| `POST /api/extract-places-from-url` | Extract travel places from a URL |
| `POST /api/extract-places-from-image` | Extract travel places from an image |
| `POST /api/screenshot-extract` | Extract and merge OCR text from multiple screenshots |
| `POST /api/screenshot-submit` | Submit reviewed OCR text into itinerary parser flow |
| `POST /api/suggestion-placement-preview` | Preview manual/AI day placement assignments |
| `POST /api/suggestion-placement-commit` | Commit confirmed day assignments for suggestions |
| `PATCH /api/stop-timing` | Persist arrival/stay timing updates and commute recalculation |
| `GET /api/place-reviews` | Fetch top public place reviews |
| `GET /api/place-map-link` | Build direct place map deep link |
| `POST /api/route-link` | Build full route deep link for ordered itinerary stops |
| `POST /api/generate-ai-suggestions` | Generate AI-powered place suggestions |

All endpoint implementations live in `server/api/`; `api/[...route].ts` dispatches requests so this project stays within Vercel Hobby function-count limits.

## Project Structure

```text
TravelBetter/
├── api/                    # Vercel entrypoint
│   └── [...route].ts       # Catch-all router for /api/*
├── server/
│   └── api/                # API handler implementations + tests
│       ├── extract-places-from-url.ts
│       ├── extract-places-from-image.ts
│       └── generate-ai-suggestions.ts
├── src/
│   ├── components/         # React components
│   ├── pages/              # Page components
│   ├── contexts/           # React Context
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # External API integrations
│   ├── lib/                # Utility libraries
│   ├── types/              # TypeScript types
│   └── App.tsx             # Main app component
├── supabase/
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

## Getting a Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create a new API key or use an existing one
4. Add it to your Vercel environment variables as `GOOGLE_API_KEY`

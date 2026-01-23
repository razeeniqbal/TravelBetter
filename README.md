# TravelBetter

AI-powered travel planning app to help you discover and organize your perfect trip.

## Features

- AI-powered place suggestions based on your preferences
- Extract travel places from URLs (YouTube, Instagram, TikTok, etc.)
- Extract travel places from images
- Trip planning and itinerary management
- User authentication via Supabase

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
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_API_KEY_TEXT_EXTRACT=your_google_api_key
GEMINI_TEXT_EXT_MODEL=gemini-2.0-flash
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

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
| `GEMINI_MODEL` | Optional Gemini model name (defaults to `gemini-2.0-flash`) |
| `GOOGLE_API_KEY_TEXT_EXTRACT` | Optional key override for text extraction (fallbacks to `GOOGLE_API_KEY`) |
| `GEMINI_TEXT_EXT_MODEL` | Optional model override for text extraction (fallbacks to `GEMINI_MODEL`) |

### 3. Deploy

Click "Deploy" - Vercel will:
- Build the React frontend
- Deploy the `/api` serverless functions automatically
- Set up routing so `/api/*` routes to your functions

### API Routes

The following serverless functions are available:

| Endpoint | Description |
|----------|-------------|
| `POST /api/extract-places-from-url` | Extract travel places from a URL |
| `POST /api/extract-places-from-image` | Extract travel places from an image |
| `POST /api/generate-ai-suggestions` | Generate AI-powered place suggestions |

## Project Structure

```text
TravelBetter/
├── api/                    # Vercel Serverless Functions
│   ├── extract-places-from-url.ts
│   ├── extract-places-from-image.ts
│   └── generate-ai-suggestions.ts
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

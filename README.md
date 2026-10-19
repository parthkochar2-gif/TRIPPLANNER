# Wanderwise Travel Planner

A single-project Vercel app for a personalized travel itinerary planner. This version keeps the React frontend and serverless API in the same deployable folder, so you can push it to Vercel without needing a separate backend deployment.

## Features

- Responsive travel planner dashboard
- Trip creation flow with destination, dates, budget, travelers, style, pace, and interests
- Demo itinerary generation with optional AI-powered generation
- Saved trips list with search and quick filtering
- Editable trip details and delete flow
- Ready to deploy on Vercel as a single app

## Project structure

```text
vercel-single-deploy/
├── api/
│   ├── health.js
│   ├── trips.js
│   ├── trips/
│   │   └── [tripId].js
│   └── lib/
│       └── trip-store.js
├── src/
│   ├── main.jsx
│   └── style.css
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── .gitignore
└── README.md
```

## Local development

1. Open a terminal in this folder.
2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm run dev
```

4. Open the local site in your browser:

```text
http://localhost:5173
```

## API behavior

The app exposes endpoints under `/api` and is designed to work with Vercel serverless functions.

Examples:

- `GET /api/health`
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/:tripId`
- `PUT /api/trips/:tripId`
- `DELETE /api/trips/:tripId`

## Optional AI setup

To enable AI-generated itineraries, copy the example file and add your keys:

```bash
copy .env.example .env
```

Then set:

```env
AI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

If no key is present, the app falls back to the built-in demo itinerary generator.

## Deploy to Vercel

1. Push this folder to GitHub.
2. Open Vercel.
3. Import the repository.
4. Select this folder as the project root.
5. Click Deploy.

Vercel will use the root `package.json` and `vercel.json` to serve both the frontend and the API.

## Notes

- This is a deployment-ready starter project.
- The demo itinerary is sample content and should be checked before real travel planning.
- For production use, add proper auth, database persistence, and environment security.

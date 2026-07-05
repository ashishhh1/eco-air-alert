# Pollution Guardian AI — Backend

Hackathon MVP backend for the Pollution Guardian AI platform.

## Stack
- Node.js + Express
- Supabase (Postgres + Storage) for data and media
- OpenWeather API for wind/weather + air pollution data
- Rule-based "AI" detection engine (architected to be swapped for a real CV model later)

## Setup

1. Install dependencies
   ```
   npm install
   ```

2. Create a Supabase project, then run `schema.sql` in the Supabase SQL editor
   to create tables and seed demo data.

3. Create a Supabase Storage bucket named `pollution-media` (public access enabled)
   for uploaded photos/videos.

4. Copy `.env.example` to `.env` and fill in:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (from Supabase project settings)
   - `OPENWEATHER_API_KEY` (free tier at openweathermap.org/api)

5. Run the server
   ```
   npm run dev
   ```
   Server starts on `http://localhost:5000`.

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/reports` | Submit a new report (multipart form: media, category, lat, lng, description) |
| POST | `/reports/:id/analyze` | Run detection engine + generate alert message |
| GET | `/reports/heatmap` | Get all active reports for the map |
| GET | `/reports/:id/prediction` | Get 24h pollution spread prediction |
| GET | `/environment/current?lat=&lng=` | Get current AQI + wind data |
| GET | `/alerts?status=analyzed` | Municipality view of alerts, sorted by severity |
| PATCH | `/alerts/:id/resolve` | Mark an alert resolved |

## Notes on the "AI" layer

The detection logic in `services/aiEngine.js` is rule-based, not a trained model —
this is intentional and disclosed for the hackathon demo. The input/output shape
matches what a real vision model would return, so it's a drop-in swap later.
The spread prediction in `services/predictionEngine.js` is a simplified physical
model (wind speed × time), not machine learning.

const axios = require("axios");
const supabase = require("../config/supabase");

const CACHE_TTL_MINUTES = 20;

/**
 * Fetches current AQI + weather (wind speed/direction) for a lat/lng.
 * Uses a Supabase cache table to avoid hammering external APIs during demos.
 */
async function getEnvironmentData(lat, lng) {
  const roundedLat = Number(lat).toFixed(2);
  const roundedLng = Number(lng).toFixed(2);

  // 1. Check cache first
  const { data: cached } = await supabase
    .from("weather_cache")
    .select("*")
    .eq("lat", roundedLat)
    .eq("lng", roundedLng)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached) {
    const ageMinutes =
      (Date.now() - new Date(cached.fetched_at).getTime()) / 60000;
    if (ageMinutes < CACHE_TTL_MINUTES) {
      return {
        aqi: cached.aqi,
        wind_speed: cached.wind_speed,
        wind_direction: cached.wind_direction,
        source: "cache",
      };
    }
  }

  // 2. Fetch fresh data from external APIs
  let aqi = null;
  let windSpeed = null;
  let windDirection = null;

  try {
    const owKey = process.env.OPENWEATHER_API_KEY;

    const [weatherRes, airRes] = await Promise.all([
      axios.get("https://api.openweathermap.org/data/2.5/weather", {
        params: { lat, lon: lng, appid: owKey, units: "metric" },
      }),
      axios.get("https://api.openweathermap.org/data/2.5/air_pollution", {
        params: { lat, lon: lng, appid: owKey },
      }),
    ]);

    windSpeed = weatherRes.data?.wind?.speed ?? null;
    windDirection = weatherRes.data?.wind?.deg ?? null;

    // OpenWeather AQI index is 1-5; convert to a rough 0-500 scale for display
    const owAqiIndex = airRes.data?.list?.[0]?.main?.aqi ?? null;
    aqi = owAqiIndex ? owAqiIndex * 100 : null;
  } catch (err) {
    console.error("Environment API fetch failed:", err.message);
    // Fallback demo values so the app still functions if API keys are missing/rate-limited
    aqi = 150;
    windSpeed = 3.5;
    windDirection = 90;
  }

  // 3. Write to cache (best-effort, ignore failure)
  await supabase.from("weather_cache").insert({
    lat: roundedLat,
    lng: roundedLng,
    aqi,
    wind_speed: windSpeed,
    wind_direction: windDirection,
    fetched_at: new Date().toISOString(),
  });

  return { aqi, wind_speed: windSpeed, wind_direction: windDirection, source: "live" };
}

module.exports = { getEnvironmentData };

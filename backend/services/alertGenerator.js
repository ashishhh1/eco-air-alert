const supabase = require("../config/supabase");

const CATEGORY_LABELS = {
  smoke: "Smoke",
  dust: "Dust pollution",
  fire: "Fire",
  factory_emission: "Factory emissions",
  construction: "Construction dust",
};

const CATEGORY_LIKELY_CAUSE = {
  smoke: "garbage burning",
  dust: "dust from nearby construction or unpaved roads",
  fire: "an active fire",
  factory_emission: "industrial emissions",
  construction: "construction activity",
};

/**
 * Finds the nearest seeded landmark to a lat/lng (simple straight-line distance).
 */
async function findNearestLandmark(lat, lng) {
  const { data: landmarks } = await supabase.from("landmarks").select("*");
  if (!landmarks || landmarks.length === 0) return null;

  let nearest = null;
  let minDist = Infinity;

  for (const lm of landmarks) {
    const dist = Math.sqrt(
      Math.pow(lm.lat - lat, 2) + Math.pow(lm.lng - lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = lm;
    }
  }

  // Rough conversion of coordinate-degree distance to km
  const distanceKm = Number((minDist * 111).toFixed(1));
  return { ...nearest, distance_km: distanceKm };
}

/**
 * Generates a human-readable alert sentence, e.g.:
 * "Possible garbage burning near XYZ Road. Smoke likely to affect
 *  schools within 3 km in 2 hours."
 */
async function generateAlertMessage({
  category,
  locationName,
  lat,
  lng,
  windSpeed,
}) {
  const normalizedCategory = (category || "smoke").toLowerCase();
  const label = CATEGORY_LABELS[normalizedCategory] || "Pollution";
  const cause = CATEGORY_LIKELY_CAUSE[normalizedCategory] || "an unknown source";

  const nearestLandmark = await findNearestLandmark(lat, lng);

  // Estimate time-to-impact based on wind speed (very rough demo heuristic)
  const speed = windSpeed && windSpeed > 0 ? windSpeed : 2;
  const etaHours = Math.max(0.5, Math.round((3 / speed) * 10) / 10);

  const place = locationName || "the reported location";

  if (nearestLandmark) {
    return (
      `Possible ${cause} near ${place}. ${label} likely to affect ` +
      `${nearestLandmark.type}s near ${nearestLandmark.name} ` +
      `(~${nearestLandmark.distance_km} km away) within ${etaHours} hour(s).`
    );
  }

  return `Possible ${cause} near ${place}. ${label} may spread to surrounding areas within ${etaHours} hour(s).`;
}

module.exports = { generateAlertMessage };

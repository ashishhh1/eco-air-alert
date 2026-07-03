// Domain helpers for Pollution Guardian AI

export type Category = "Smoke" | "Dust" | "Fire" | "Factory Emission" | "Construction";
export type Severity = "low" | "medium" | "high";

export const CATEGORIES: Category[] = [
  "Smoke",
  "Dust",
  "Fire",
  "Factory Emission",
  "Construction",
];

export const CATEGORY_META: Record<Category, { emoji: string; hint: string }> = {
  Smoke: { emoji: "🔥", hint: "Garbage burning, vehicle exhaust plume" },
  Dust: { emoji: "🌫️", hint: "Road dust, unpaved surfaces, wind erosion" },
  Fire: { emoji: "🚒", hint: "Active fire, forest / structural" },
  "Factory Emission": { emoji: "🏭", hint: "Industrial stack emission" },
  Construction: { emoji: "🏗️", hint: "Construction / demolition dust" },
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#eab308", // amber
  medium: "#f97316", // orange
  high: "#dc2626", // red
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function aqiBand(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#16a34a" };
  if (aqi <= 100) return { label: "Moderate", color: "#eab308" };
  if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "#f97316" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#dc2626" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#9333ea" };
  return { label: "Hazardous", color: "#7f1d1d" };
}

const CATEGORY_SEVERITY_BIAS: Record<Category, Severity> = {
  Smoke: "medium",
  Dust: "low",
  Fire: "high",
  "Factory Emission": "high",
  Construction: "medium",
};

export function mockClassify(category: Category, filename?: string) {
  // Rule-based "AI" — deterministic-ish confidence bumped by hints in filename
  const base = 72 + Math.floor(Math.random() * 20);
  const lower = (filename ?? "").toLowerCase();
  let bump = 0;
  if (lower.includes(category.toLowerCase().split(" ")[0])) bump += 6;
  if (lower.match(/dark|black|thick|dense|plume/)) bump += 3;
  const confidence = Math.min(98, base + bump);

  let severity: Severity = CATEGORY_SEVERITY_BIAS[category];
  if (confidence > 92 && severity !== "high") severity = severity === "low" ? "medium" : "high";
  if (confidence < 78 && severity === "high") severity = "medium";

  return { confidence, severity };
}

function windDirName(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((deg % 360) / 45) % 8];
}

export function buildAlert(opts: {
  category: Category;
  severity: Severity;
  locationName: string;
  windDeg?: number | null;
  windSpeed?: number | null;
}) {
  const { category, severity, locationName, windDeg, windSpeed } = opts;
  const dir = typeof windDeg === "number" ? windDirName(windDeg) : "downwind";
  const speed = typeof windSpeed === "number" ? windSpeed : 3;
  const km = Math.max(1, Math.round(speed * 1.2));
  const hrs = severity === "high" ? 1 : severity === "medium" ? 2 : 3;
  const now = new Date();
  const eta = new Date(now.getTime() + hrs * 3600_000);
  const etaStr = eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const templates: Record<Category, string> = {
    Smoke: `Possible garbage burning near ${locationName}. Smoke drifting ${dir} likely to affect residents and schools within ${km} km by ${etaStr}.`,
    Dust: `Dust plume detected near ${locationName}. Particulate matter drifting ${dir} may reduce visibility within ${km} km by ${etaStr}.`,
    Fire: `Active fire reported at ${locationName}. Toxic smoke moving ${dir} — evacuation advised within ${km} km, reaching downwind areas by ${etaStr}.`,
    "Factory Emission": `Industrial emission spike at ${locationName}. Plume drifting ${dir} expected to impact areas ${km} km away by ${etaStr}.`,
    Construction: `Construction dust flagged at ${locationName}. Fine particles drifting ${dir} likely to affect nearby residents within ${km} km by ${etaStr}.`,
  };
  return templates[category];
}

// Compute an expansion radius (meters) for the 24h prediction ring
export function predictionRadiusMeters(windSpeed: number | null | undefined, severity: Severity) {
  const speed = windSpeed ?? 3;
  const sevMult = severity === "high" ? 1.6 : severity === "medium" ? 1.2 : 0.9;
  // ~3.6 km per m/s over the demo window; capped
  return Math.min(15000, Math.max(600, speed * 900 * sevMult));
}

// Fetch AQI + weather from Open-Meteo (no key needed)
export async function fetchEnvironment(lat: number, lng: number) {
  const [aqRes, wxRes] = await Promise.all([
    fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10`,
    ),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m,wind_direction_10m,temperature_2m`,
    ),
  ]);
  const aq = aqRes.ok ? await aqRes.json() : null;
  const wx = wxRes.ok ? await wxRes.json() : null;
  return {
    aqi: (aq?.current?.us_aqi as number | undefined) ?? null,
    pm25: (aq?.current?.pm2_5 as number | undefined) ?? null,
    pm10: (aq?.current?.pm10 as number | undefined) ?? null,
    windSpeed: (wx?.current?.wind_speed_10m as number | undefined) ?? null,
    windDeg: (wx?.current?.wind_direction_10m as number | undefined) ?? null,
    temp: (wx?.current?.temperature_2m as number | undefined) ?? null,
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) throw new Error();
    const j = await res.json();
    const a = j.address ?? {};
    return (
      a.suburb ||
      a.neighbourhood ||
      a.road ||
      a.village ||
      a.town ||
      a.city_district ||
      a.city ||
      a.county ||
      `${lat.toFixed(3)}, ${lng.toFixed(3)}`
    );
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}

// Downscale an image file to a small JPEG data URL
export function fileToCompressedDataUrl(file: File, maxSize = 900, quality = 0.75) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

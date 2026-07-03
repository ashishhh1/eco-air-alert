import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { PollutionMap } from "@/components/PollutionMap";
import {
  CATEGORIES,
  CATEGORY_META,
  SEVERITY_LABEL,
  buildAlert,
  fetchEnvironment,
  fileToCompressedDataUrl,
  mockClassify,
  reverseGeocode,
  type Category,
} from "@/lib/pollution";
import { insertReport } from "@/lib/reports";
import {
  Camera,
  Crosshair,
  Loader2,
  Sparkles,
  MapPin,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report Pollution · Pollution Guardian AI" },
      {
        name: "description",
        content: "Upload a photo, pin the location, get an AI verdict in seconds.",
      },
    ],
  }),
  component: ReportPage,
});

type Result = {
  category: Category;
  confidence: number;
  severity: "low" | "medium" | "high";
  message: string;
  locationName: string;
  windDeg: number | null;
  windSpeed: number | null;
  aqi: number | null;
};

function ReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("Smoke");
  const [description, setDescription] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locName, setLocName] = useState<string>("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    // guess category from filename
    const lower = file.name.toLowerCase();
    const guess = CATEGORIES.find((c) => lower.includes(c.toLowerCase().split(" ")[0]));
    if (guess) setCategory(guess);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function locate() {
    setLocating(true);
    try {
      const p = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("no geolocation"));
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
      });
      const lat = p.coords.latitude;
      const lng = p.coords.longitude;
      setPos({ lat, lng });
      setLocName(await reverseGeocode(lat, lng));
    } catch {
      // fallback default = New Delhi
      setPos({ lat: 28.6139, lng: 77.209 });
      setLocName("New Delhi");
    } finally {
      setLocating(false);
    }
  }

  async function onMapClick(lat: number, lng: number) {
    setPos({ lat, lng });
    setLocName(await reverseGeocode(lat, lng));
  }

  async function submit() {
    if (!pos) {
      alert("Pick a location first — use the crosshair or tap the map.");
      return;
    }
    setSubmitting(true);
    try {
      const [env, dataUrl] = await Promise.all([
        fetchEnvironment(pos.lat, pos.lng),
        file ? fileToCompressedDataUrl(file, 800, 0.7) : Promise.resolve<string | null>(null),
      ]);
      const { confidence, severity } = mockClassify(category, file?.name);
      const message = buildAlert({
        category,
        severity,
        locationName: locName || "the reported area",
        windDeg: env.windDeg,
        windSpeed: env.windSpeed,
      });

      const saved = await insertReport({
        image_url: dataUrl,
        category,
        location_name: locName || null,
        lat: pos.lat,
        lng: pos.lng,
        severity,
        confidence,
        ai_message: message,
        description: description || null,
        wind_speed: env.windSpeed,
        wind_deg: env.windDeg,
      });
      setSavedId(saved.id);
      setResult({
        category,
        confidence,
        severity,
        message,
        locationName: locName,
        windDeg: env.windDeg,
        windSpeed: env.windSpeed,
        aqi: env.aqi,
      });
    } catch (e) {
      console.error(e);
      alert("Could not submit report. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const previewReports = useMemo(
    () =>
      pos && result
        ? [
            {
              id: "preview",
              user_id: null,
              image_url: null,
              category: result.category,
              location_name: result.locationName,
              lat: pos.lat,
              lng: pos.lng,
              severity: result.severity,
              confidence: result.confidence,
              ai_message: result.message,
              description: null,
              wind_speed: result.windSpeed,
              wind_deg: result.windDeg,
              status: "active",
              created_at: new Date().toISOString(),
            },
          ]
        : [],
    [pos, result],
  );

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Report an incident
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload a photo, drop a pin, describe what you saw. Our AI does the rest.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="space-y-5 lg:col-span-2">
            {/* File */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="text-sm font-semibold">1 · Photo or video</label>
              <div
                className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-background px-4 py-8 text-center transition hover:border-primary/50 hover:bg-accent/40"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="max-h-56 rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <div className="mt-2 text-sm font-medium">Tap to upload / take photo</div>
                    <div className="text-xs text-muted-foreground">JPEG, PNG, or MP4</div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            {/* Category */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <label className="text-sm font-semibold">2 · What is it?</label>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      category === c
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>{CATEGORY_META[c].emoji}</span>
                      <span>{c}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {CATEGORY_META[c].hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">3 · Location</label>
                <button
                  type="button"
                  onClick={locate}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  {locating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Crosshair className="h-3 w-3" />
                  )}
                  Use my location
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {pos ? (
                  <span>
                    <span className="font-medium text-foreground">
                      {locName || "Pinned"}
                    </span>{" "}
                    <span className="text-xs">
                      ({pos.lat.toFixed(4)}, {pos.lng.toFixed(4)})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs">
                    Use crosshair, or tap the map to drop a pin.
                  </span>
                )}
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="Optional description — what did you see or smell?"
                className="mt-3 w-full rounded-lg border border-border bg-background p-3 text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <button
              onClick={submit}
              disabled={submitting || !pos}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {submitting ? "Analyzing…" : "Submit & run AI analysis"}
            </button>
          </section>

          <section className="space-y-4 lg:col-span-3">
            <div className="h-[380px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <PollutionMap
                reports={previewReports}
                onMapClick={onMapClick}
                pinned={pos}
                center={pos ? [pos.lat, pos.lng] : undefined}
                zoom={pos ? 13 : 11}
                showPredictions={!!result}
              />
            </div>

            {result ? (
              <ResultCard result={result} savedId={savedId} preview={preview} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" /> AI verdict will appear here
                </div>
                We'll classify the source, rate severity, and predict how far the plume
                will drift using live wind data.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function ResultCard({
  result,
  savedId,
  preview,
}: {
  result: Result;
  savedId: string | null;
  preview: string | null;
}) {
  const sevClass =
    result.severity === "high"
      ? "text-danger bg-danger/10 border-danger/30"
      : result.severity === "medium"
      ? "text-warn bg-warn/10 border-warn/30"
      : "text-safe bg-safe/10 border-safe/30";
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> AI Analysis Complete
        </div>
        {savedId && (
          <div className="inline-flex items-center gap-1 text-xs text-safe">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <div className="text-2xl font-bold">
          {result.category}{" "}
          <span className="text-primary">— {result.confidence}% confidence</span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${sevClass}`}
        >
          {SEVERITY_LABEL[result.severity]} severity
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{result.message}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Current AQI" value={result.aqi != null ? String(Math.round(result.aqi)) : "—"} />
        <Stat
          label="Wind"
          value={
            result.windSpeed != null
              ? `${result.windSpeed.toFixed(1)} m/s @ ${Math.round(result.windDeg ?? 0)}°`
              : "—"
          }
        />
        <Stat label="Location" value={result.locationName || "—"} />
      </div>
      {preview && (
        <img
          src={preview}
          alt=""
          className="mt-4 max-h-44 rounded-lg border border-border object-cover"
        />
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          View on live map <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent"
        >
          Send to officials
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

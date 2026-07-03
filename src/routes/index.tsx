import { createFileRoute, Link } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import {
  Camera,
  MapPinned,
  Sparkles,
  ShieldAlert,
  Wind,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <AppNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-accent),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Citizen + AI air quality intelligence
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              See it. <span className="text-primary">Report it.</span> Predict it.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Pollution Guardian AI turns every smartphone into a pollution sensor. Snap a
              photo of smoke, dust or industrial emissions — our AI classifies the source,
              fuses live AQI and wind data, and predicts how the plume will spread across
              your city.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                <Camera className="h-4 w-4" /> Report Pollution
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
              >
                <MapPinned className="h-4 w-4" /> Open Live Map
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-safe" /> Safe
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warn" /> Moderate
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-danger" /> Hazardous
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Live AQI · Delhi
                    </div>
                    <div className="mt-1 text-4xl font-bold text-danger">187</div>
                    <div className="text-sm text-muted-foreground">Unhealthy · PM2.5 spike</div>
                  </div>
                  <div className="rounded-xl bg-danger/10 p-3 text-danger">
                    <Wind className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[68%] bg-gradient-to-r from-safe via-warn to-danger" />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Verdict
                </div>
                <div className="text-sm font-semibold">Smoke · 87% confidence</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Garbage burning near Karol Bagh — drifting NW.
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldAlert className="h-3.5 w-3.5 text-danger" /> Predicted spread
                </div>
                <div className="text-sm font-semibold">3 schools · 2h ETA</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Radius growing at 4.2 km/h with current wind.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight">
              A pollution early-warning system, built by the people it protects.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Municipal sensors are sparse and slow. Citizens are everywhere. We combine
              both to give city officials actionable, ground-truth alerts within seconds.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                n: "1",
                icon: <Camera className="h-5 w-5" />,
                title: "Snap & pin",
                body:
                  "Citizens photograph smoke, dust, or industrial plumes and drop a pin on the map.",
              },
              {
                n: "2",
                icon: <Sparkles className="h-5 w-5" />,
                title: "AI classifies",
                body:
                  "Our model tags the source (smoke, fire, factory…) and rates severity from live AQI + weather.",
              },
              {
                n: "3",
                icon: <ShieldAlert className="h-5 w-5" />,
                title: "Officials act",
                body:
                  "Alerts land on a municipal dashboard with predicted spread, so response can beat the plume.",
              },
            ].map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {s.icon}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">Step {s.n}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div>
              <div className="text-lg font-semibold">Ready to report an incident?</div>
              <div className="text-sm text-muted-foreground">
                Takes under 30 seconds. No signup required for the MVP.
              </div>
            </div>
            <Link
              to="/report"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Start a report <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              "Real vision-model classification",
              "SMS alerts to municipality",
              "Historical trend charts",
            ].map((label) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground"
              >
                <span>{label}</span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Pollution Guardian AI · Built for cleaner air, one report at a time.
      </footer>
    </div>
  );
}

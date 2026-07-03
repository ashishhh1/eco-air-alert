import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { PollutionMap } from "@/components/PollutionMap";
import { listReports, type Report } from "@/lib/reports";
import { aqiBand, fetchEnvironment, SEVERITY_COLOR } from "@/lib/pollution";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wind, Activity, MapPin } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Live Pollution Map · Pollution Guardian AI" },
      {
        name: "description",
        content:
          "Live citizen-reported pollution incidents with AI severity, AQI overlay, and 24-hour spread prediction.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState<{
    aqi: number | null;
    pm25: number | null;
    windSpeed: number | null;
    windDeg: number | null;
  } | null>(null);
  const [showPredictions, setShowPredictions] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await listReports();
        if (mounted) setReports(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // AQI overlay for center of map (defaults to Delhi)
    fetchEnvironment(28.6139, 77.209).then((e) => mounted && setEnv(e));

    const channel = supabase
      .channel("reports-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          listReports().then((r) => mounted && setReports(r));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const counts = useMemo(() => {
    const active = reports.filter((r) => r.status === "active");
    return {
      total: reports.length,
      active: active.length,
      high: active.filter((r) => r.severity === "high").length,
    };
  }, [reports]);

  const center = useMemo<[number, number]>(() => {
    if (!reports.length) return [28.6139, 77.209];
    const latAvg = reports.reduce((a, r) => a + r.lat, 0) / reports.length;
    const lngAvg = reports.reduce((a, r) => a + r.lng, 0) / reports.length;
    return [latAvg, lngAvg];
  }, [reports]);

  const band = env?.aqi != null ? aqiBand(env.aqi) : null;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Live pollution map</h1>
            <p className="text-sm text-muted-foreground">
              Citizen reports fused with real-time AQI &amp; wind data.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={showPredictions}
              onChange={(e) => setShowPredictions(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Show 24h spread prediction
          </label>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi
            label="Current AQI"
            value={env?.aqi != null ? Math.round(env.aqi).toString() : "—"}
            sub={band?.label ?? ""}
            color={band?.color ?? "var(--color-muted-foreground)"}
            icon={<Activity className="h-4 w-4" />}
          />
          <Kpi
            label="Wind"
            value={
              env?.windSpeed != null
                ? `${env.windSpeed.toFixed(1)} m/s`
                : "—"
            }
            sub={env?.windDeg != null ? `Bearing ${Math.round(env.windDeg)}°` : ""}
            icon={<Wind className="h-4 w-4" />}
          />
          <Kpi
            label="Active reports"
            value={counts.active.toString()}
            sub={`${counts.high} high severity`}
            icon={<MapPin className="h-4 w-4" />}
          />
          <Kpi
            label="PM2.5"
            value={env?.pm25 != null ? env.pm25.toFixed(1) : "—"}
            sub="µg/m³"
            icon={<Activity className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading map…
              </div>
            ) : (
              <PollutionMap
                reports={reports.filter((r) => r.status === "active")}
                center={center}
                zoom={11}
                showPredictions={showPredictions}
              />
            )}
          </div>

          <aside className="max-h-[560px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-semibold">Recent reports</div>
              <div className="text-xs text-muted-foreground">
                Real-time — updates as citizens submit
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
              {reports.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No reports yet.
                </div>
              )}
              {reports.map((r) => (
                <ReportRow key={r.id} report={r} />
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-1 text-2xl font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ReportRow({ report }: { report: Report }) {
  const color = SEVERITY_COLOR[report.severity];
  const ago = timeAgo(report.created_at);
  return (
    <div className="flex gap-3 p-4">
      <span
        className="mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold">
            {report.category} · {report.location_name ?? "Unknown"}
          </div>
          <div className="shrink-0 text-[11px] text-muted-foreground">{ago}</div>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {report.ai_message}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span
            className="rounded-full px-1.5 py-0.5 font-semibold uppercase text-white"
            style={{ backgroundColor: color }}
          >
            {report.severity}
          </span>
          <span>{report.confidence}% AI</span>
          {report.status !== "active" && (
            <span className="rounded-full bg-safe/20 px-1.5 py-0.5 text-safe">
              {report.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

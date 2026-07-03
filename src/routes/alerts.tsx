import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { listReports, updateReportStatus, type Report } from "@/lib/reports";
import { SEVERITY_COLOR, SEVERITY_LABEL } from "@/lib/pollution";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, MapPin, ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Municipality Alerts · Pollution Guardian AI" },
      {
        name: "description",
        content: "Officials dashboard: incoming citizen pollution alerts sorted by severity.",
      },
    ],
  }),
  component: AlertsPage,
});

const SEV_ORDER = { high: 0, medium: 1, low: 2 } as const;

function AlertsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setReports(await listReports());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const channel = supabase
      .channel("reports-alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => listReports().then((r) => mounted && setReports(r)),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const sorted = useMemo(() => {
    const filtered = reports.filter((r) =>
      filter === "all" ? true : r.status === filter,
    );
    return [...filtered].sort((a, b) => {
      const s = SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (s !== 0) return s;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reports, filter]);

  async function resolve(id: string) {
    setResolving(id);
    try {
      await updateReportStatus(id, "resolved");
    } finally {
      setResolving(null);
    }
  }

  const highCount = reports.filter((r) => r.status === "active" && r.severity === "high").length;

  return (
    <div className="min-h-screen">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-danger">
              <ShieldAlert className="h-3 w-3" /> Officials view
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Municipality alerts
            </h1>
            <p className="text-sm text-muted-foreground">
              {highCount} high-severity alert{highCount === 1 ? "" : "s"} awaiting response.
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-card p-1 text-sm">
            {(["active", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 capitalize transition ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No {filter} alerts.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((r) => (
              <AlertCard
                key={r.id}
                report={r}
                onResolve={() => resolve(r.id)}
                busy={resolving === r.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AlertCard({
  report,
  onResolve,
  busy,
}: {
  report: Report;
  onResolve: () => void;
  busy: boolean;
}) {
  const color = SEVERITY_COLOR[report.severity];
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${report.lat}&mlon=${report.lng}#map=15/${report.lat}/${report.lng}`;
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div
        className="h-1.5 w-full"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <div className="grid gap-4 p-5 sm:grid-cols-[7rem,1fr]">
        {report.image_url ? (
          <img
            src={report.image_url}
            alt={report.category}
            className="h-28 w-full rounded-lg object-cover sm:w-28"
          />
        ) : (
          <div className="flex h-28 w-full items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground sm:w-28">
            No photo
          </div>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{ backgroundColor: color }}
            >
              {SEVERITY_LABEL[report.severity]}
            </span>
            <h3 className="truncate font-semibold">
              {report.category} · {report.location_name ?? "Unknown"}
            </h3>
          </div>
          <p className="mt-1.5 text-sm text-foreground/90">{report.ai_message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{report.confidence}% AI confidence</span>
            <span>·</span>
            <span>{new Date(report.created_at).toLocaleString()}</span>
            {report.wind_speed != null && (
              <>
                <span>·</span>
                <span>
                  Wind {report.wind_speed.toFixed(1)} m/s @{" "}
                  {Math.round(report.wind_deg ?? 0)}°
                </span>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              <MapPin className="h-3.5 w-3.5" /> View on map
            </a>
            {report.status === "active" ? (
              <button
                onClick={onResolve}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Mark as resolved
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-safe/15 px-3 py-1.5 text-xs font-semibold text-safe">
                <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

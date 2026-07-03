import { useEffect, useRef } from "react";
import type { Report } from "@/lib/reports";
import { SEVERITY_COLOR, predictionRadiusMeters } from "@/lib/pollution";

interface Props {
  reports: Report[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMapClick?: (lat: number, lng: number) => void;
  pinned?: { lat: number; lng: number } | null;
  showPredictions?: boolean;
}

// Client-only Leaflet map. We dynamically import leaflet inside useEffect so
// this component works in SSR/prerender.
export function PollutionMap({
  reports,
  center = [28.6139, 77.209],
  zoom = 11,
  className,
  onMapClick,
  pinned,
  showPredictions = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const pinRef = useRef<any>(null);
  const clickHandlerRef = useRef<Props["onMapClick"]>(onMapClick);
  clickHandlerRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(
        center,
        zoom,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e: any) => {
        clickHandlerRef.current?.(e.latlng.lat, e.latlng.lng);
      });
      mapRef.current = map;
      // trigger render of markers
      renderLayers(L);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function renderLayers(L?: any) {
    const map = mapRef.current;
    if (!map) return;
    const Lm = L ?? (await import("leaflet"));
    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];
    for (const r of reports) {
      const color = SEVERITY_COLOR[r.severity];
      const marker = Lm.circleMarker([r.lat, r.lng], {
        radius: r.severity === "high" ? 11 : r.severity === "medium" ? 9 : 7,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }).addTo(map);
      marker.bindPopup(
        `<div style="min-width:180px">
          <div style="font-weight:600;margin-bottom:2px">${r.category} · ${r.severity.toUpperCase()}</div>
          <div style="font-size:12px;color:#555;margin-bottom:6px">${r.location_name ?? ""}</div>
          <div style="font-size:12px">${r.ai_message}</div>
        </div>`,
      );
      layersRef.current.push(marker);
      if (showPredictions) {
        const ring = Lm.circle([r.lat, r.lng], {
          radius: predictionRadiusMeters(r.wind_speed, r.severity),
          color,
          weight: 1,
          fillColor: color,
          fillOpacity: 0.08,
          dashArray: "4 4",
        }).addTo(map);
        layersRef.current.push(ring);
      }
    }
  }

  useEffect(() => {
    renderLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, showPredictions]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (async () => {
      const L = await import("leaflet");
      if (pinRef.current) {
        map.removeLayer(pinRef.current);
        pinRef.current = null;
      }
      if (pinned) {
        pinRef.current = L.marker([pinned.lat, pinned.lng]).addTo(map);
      }
    })();
  }, [pinned]);

  return <div ref={containerRef} className={className ?? "h-full w-full rounded-lg"} />;
}

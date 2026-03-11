"use client";

import { useEffect } from "react";
import type { LatLngLiteral } from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

import type { Bin, BinStatus } from "./bin-data";
import { getBinStatus } from "./bin-data";

const STATUS_COLORS: Record<BinStatus, string> = {
  full: "#f25f5c",
  medium: "#f7b32b",
  low: "#2a9d8f",
};

export type BinMapProps = {
  bins: Bin[];
  center: LatLngLiteral;
  addMode: boolean;
  moveMode: boolean;
  selectedId: string | null;
  routePath?: LatLngLiteral[];
  routeStops?: { id: string; lat: number; lng: number }[];
  onAdd: (coords: LatLngLiteral) => void;
  onMove: (coords: LatLngLiteral) => void;
  onSelect: (id: string) => void;
};

type MapClickHandlerProps = {
  addMode: boolean;
  moveMode: boolean;
  onAdd: (coords: LatLngLiteral) => void;
  onMove: (coords: LatLngLiteral) => void;
};

function MapClickHandler({ addMode, moveMode, onAdd, onMove }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      if (addMode) {
        onAdd(event.latlng);
        return;
      }
      if (moveMode) {
        onMove(event.latlng);
      }
    },
  });

  return null;
}

function FitRouteBounds({ routePath }: { routePath?: LatLngLiteral[] }) {
  const map = useMap();

  useEffect(() => {
    if (!routePath || routePath.length < 2) return;
    const bounds: [number, number][] = routePath.map(p => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [36, 36] });
    // map.fitBounds(routePath, { padding: [36, 36] });
  }, [map, routePath]);

  return null;
}

export default function BinMap({
  bins,
  center,
  addMode,
  moveMode,
  selectedId,
  routePath,
  routeStops,
  onAdd,
  onMove,
  onSelect,
}: BinMapProps) {
  const routeStopIds = new Set((routeStops ?? []).map((stop) => stop.id));

  return (
    <div className="h-[380px] w-full overflow-hidden rounded-3xl border border-white/40 bg-white/70 shadow-xl backdrop-blur md:h-[520px]">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitRouteBounds routePath={routePath} />
        <MapClickHandler addMode={addMode} moveMode={moveMode} onAdd={onAdd} onMove={onMove} />
        {routePath && routePath.length > 1 && (
          <>
            <Polyline
              positions={routePath}
              interactive={false}
              pathOptions={{
                color: "#ffffff",
                weight: 9,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={routePath}
              interactive={false}
              pathOptions={{
                color: "#0f172a",
                weight: 5,
                opacity: 0.9,
                dashArray: "10 8",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}
        {(routeStops ?? []).map((stop, index) => {
          const isStart = index === 0;
          const isEnd = index === (routeStops?.length ?? 1) - 1;
          return (
            <CircleMarker
              key={`route-stop-${stop.id}-${index}`}
              center={[stop.lat, stop.lng]}
              radius={11}
              interactive={false}
              pathOptions={{
                color: isStart ? "#16a34a" : isEnd ? "#dc2626" : "#0f172a",
                weight: 2,
                fillColor: "#ffffff",
                fillOpacity: 1,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -14]} opacity={1}>
                <div className="text-[11px] font-semibold text-slate-900">
                  {isStart ? "START" : isEnd ? "END" : `#${index + 1}`} {stop.id}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
        {bins.map((bin) => {
          const status = getBinStatus(bin.fill);
          const isSelected = selectedId === bin.id;
          const routeStopIndex = (routeStops ?? []).findIndex((stop) => stop.id === bin.id);
          const isRouteStop = routeStopIndex >= 0;
          return (
            <CircleMarker
              key={bin.id}
              center={[bin.lat, bin.lng]}
              radius={isRouteStop ? 14 : 12}
              pathOptions={{
                color: isSelected ? "#0f172a" : "#ffffff",
                weight: isSelected || routeStopIds.has(bin.id) ? 3 : 1,
                fillColor: STATUS_COLORS[status],
                fillOpacity: 0.9,
              }}
              eventHandlers={{
                click: () => onSelect(bin.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-900">{bin.id}</div>
                  {isRouteStop && (
                    <div className="text-xs font-semibold text-slate-700">
                      Route stop #{routeStopIndex + 1}
                    </div>
                  )}
                  <div className="text-xs text-slate-600">{bin.area}</div>
                  <div className="text-xs text-slate-600">Fill level: {bin.fill}%</div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

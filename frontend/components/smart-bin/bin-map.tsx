"use client";

import type { LatLngLiteral } from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMapEvents } from "react-leaflet";

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
  routeStops?: string[];
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
        <MapClickHandler addMode={addMode} moveMode={moveMode} onAdd={onAdd} onMove={onMove} />
        {routePath && routePath.length > 1 && (
          <Polyline
            positions={routePath}
            pathOptions={{
              color: "#0f172a",
              weight: 5,
              opacity: 0.8,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}
        {bins.map((bin) => {
          const status = getBinStatus(bin.fill);
          const isSelected = selectedId === bin.id;
          const routeStopIndex = routeStops?.indexOf(bin.id) ?? -1;
          const isRouteStop = routeStopIndex >= 0;
          return (
            <CircleMarker
              key={bin.id}
              center={[bin.lat, bin.lng]}
              radius={isRouteStop ? 14 : 12}
              pathOptions={{
                color: isSelected ? "#0f172a" : "#ffffff",
                weight: isSelected || isRouteStop ? 3 : 1,
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

"use client";

import { useEffect } from "react";
import { divIcon } from "leaflet";
import type { LatLngLiteral } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { Bin, BinFillStatus, BinType } from "./bin-data";
import { getBinStatus } from "./bin-data";

const STATUS_COLORS: Record<BinFillStatus, string> = {
  full: "#f25f5c",
  medium: "#f7b32b",
  low: "#2a9d8f",
};

const TYPE_MARKER_ASSETS: Record<BinType, string> = {
  general: "/smart-bin/barcelona/icons/rebuig.png",
  plastic: "/smart-bin/barcelona/icons/recyclables.png",
  paper: "/smart-bin/barcelona/icons/paper-cardboard.png",
  glass: "/smart-bin/barcelona/icons/glass.png",
  organic: "/smart-bin/barcelona/icons/organic.png",
  metal: "/smart-bin/barcelona/icons/recyclables.png",
  electronic: "/smart-bin/barcelona/icons/rebuig.png",
  unknown: "/smart-bin/barcelona/icons/rebuig.png",
};

const TYPE_LABELS: Record<BinType, string> = {
  general: "General",
  plastic: "Plastic & Metal",
  paper: "Paper",
  glass: "Glass",
  organic: "Organic",
  metal: "Plastic & Metal",
  electronic: "Electronic",
  unknown: "Unknown",
};

const borderColor = (selected: boolean, routeStop: boolean) =>
  selected ? "#0f172a" : routeStop ? "#334155" : "#ffffff";

const markerSize = (routeStop: boolean) => (routeStop ? 30 : 26);

const createTypeIcon = (
  type: BinType,
  background: string,
  selected: boolean,
  routeStop: boolean,
  iconColor = "#ffffff"
) => {
  const size = markerSize(routeStop);
  const outline = borderColor(selected, routeStop);
  const borderWidth = selected || routeStop ? 3 : 2;
  const imageSrc = TYPE_MARKER_ASSETS[type] ?? TYPE_MARKER_ASSETS.unknown;
  const iconSize = Math.round(size * 0.68);

  return divIcon({
    className: "",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 9999px;
      background: ${background};
      border: ${borderWidth}px solid ${outline};
      box-shadow: 0 3px 8px rgba(15,23,42,0.24);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    "><img src="${imageSrc}" alt="" style="width:${iconSize}px;height:${iconSize}px;display:block;object-fit:contain;filter:${iconColor === "#e2e8f0" ? "grayscale(0.95) brightness(1.1)" : "none"};" /></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createInactiveIcon = (type: BinType, selected: boolean, routeStop: boolean) =>
  createTypeIcon(type, "#94a3b8", selected, routeStop, "#e2e8f0");

const createFillIcon = (type: BinType, fillStatus: BinFillStatus, selected: boolean, routeStop: boolean) =>
  createTypeIcon(type, STATUS_COLORS[fillStatus], selected, routeStop, "#ffffff");

const createMaintenanceIcon = (selected: boolean, routeStop: boolean) => {
  const size = markerSize(routeStop);
  const outline = borderColor(selected, routeStop);
  const strokeWidth = selected || routeStop ? 10 : 8;

  return divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100" style="display:block;filter:drop-shadow(0 3px 8px rgba(15,23,42,0.24));">
      <polygon points="50,8 94,88 6,88" fill="#facc15" stroke="${outline}" stroke-width="${strokeWidth}" stroke-linejoin="round"></polygon>
      <text x="50" y="67" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="46" font-weight="800" fill="#0f172a">!</text>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const createDepotIcon = () =>
  divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 100 100" style="display:block;filter:drop-shadow(0 4px 10px rgba(15,23,42,0.28));">
      <circle cx="50" cy="50" r="42" fill="#0f172a" stroke="#ffffff" stroke-width="7"></circle>
      <path d="M28 62V38c0-3.3 2.7-6 6-6h32c3.3 0 6 2.7 6 6v24" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path>
      <path d="M22 62h56" fill="none" stroke="#f8fafc" stroke-width="8" stroke-linecap="round"></path>
      <rect x="40" y="50" width="20" height="12" rx="2" fill="#f59e0b"></rect>
    </svg>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

export type BinMapProps = {
  bins: Bin[];
  center: LatLngLiteral;
  depot?: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
  };
  addMode: boolean;
  moveMode: boolean;
  selectedId: string | null;
  routePath?: LatLngLiteral[];
  routeStops?: {
    id: string;
    lat: number;
    lng: number;
    kind: "depot" | "bin";
    label: string;
    sequence: number | null;
  }[];
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
    const bounds: [number, number][] = routePath.map((point) => [point.lat, point.lng]);
    map.fitBounds(bounds, { padding: [36, 36] });
  }, [map, routePath]);

  return null;
}

export default function BinMap({
  bins,
  center,
  depot,
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
      <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRouteBounds routePath={routePath} />
        <MapClickHandler addMode={addMode} moveMode={moveMode} onAdd={onAdd} onMove={onMove} />

        {depot && (
          <Marker position={[depot.lat, depot.lng]} icon={createDepotIcon()}>
            <Tooltip direction="top" offset={[0, -12]} opacity={1}>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-900">Truck depot</div>
                <div className="text-xs font-semibold text-slate-700">{depot.name}</div>
                <div className="text-xs text-slate-600">{depot.address}</div>
              </div>
            </Tooltip>
          </Marker>
        )}

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
          const isDepotStop = stop.kind === "depot";
          const stopLabel = isDepotStop ? (isStart ? "DEPOT" : isEnd ? "RETURN" : "DEPOT") : `#${stop.sequence}`;
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
                  {isDepotStop ? stopLabel : `${stopLabel} ${stop.id}`}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {bins.map((bin) => {
          const fillStatus = getBinStatus(bin.fill);
          const isSelected = selectedId === bin.id;
          const routeStop = (routeStops ?? []).find(
            (stop) => stop.id === bin.id && stop.kind === "bin"
          );
          const isRouteStop = !!routeStop;
          const commonTooltip = (
            <Tooltip direction="top" offset={[0, -8]} opacity={1}>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-900">{bin.id}</div>
                {isRouteStop && (
                  <div className="text-xs font-semibold text-slate-700">
                    Route stop #{routeStop?.sequence}
                  </div>
                )}
                <div className="text-xs text-slate-600">Type: {TYPE_LABELS[bin.type]}</div>
                <div className="text-xs text-slate-600">Status: {bin.status}</div>
                <div className="text-xs text-slate-600">Fill: {bin.fill}%</div>
                <div className="text-xs text-slate-600">Battery: {bin.battery}%</div>
              </div>
            </Tooltip>
          );

          if (bin.status === "inactive") {
            return (
              <Marker
                key={bin.id}
                position={[bin.lat, bin.lng]}
                icon={createInactiveIcon(bin.type, isSelected, isRouteStop)}
                eventHandlers={{
                  click: () => onSelect(bin.id),
                }}
              >
                {commonTooltip}
              </Marker>
            );
          }

          if (bin.status === "maintenance") {
            return (
              <Marker
                key={bin.id}
                position={[bin.lat, bin.lng]}
                icon={createMaintenanceIcon(isSelected, isRouteStop)}
                eventHandlers={{
                  click: () => onSelect(bin.id),
                }}
              >
                {commonTooltip}
              </Marker>
            );
          }

          return (
            <Marker
              key={bin.id}
              position={[bin.lat, bin.lng]}
              icon={createFillIcon(bin.type, fillStatus, isSelected, isRouteStop)}
              eventHandlers={{
                click: () => onSelect(bin.id),
              }}
            >
              {commonTooltip}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

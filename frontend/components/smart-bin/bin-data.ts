export type BinType =
  | "general"
  | "plastic"
  | "paper"
  | "glass"
  | "organic"
  | "metal"
  | "electronic"
  | "unknown";

export type BinLifecycleStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "removed"
  | "unverified";

export type BinFillStatus = "low" | "medium" | "full";

export type BackendBin = {
  id: string;
  device_uid?: string;
  type?: BinType;
  location?: {
    lat: number;
    lng: number;
  };
  depth: number;
  filling_level: number;
  battery_level: number;
  status: BinLifecycleStatus;
};

export type BinUpdatePayload = {
  type?: BinType;
  location?: {
    lat: number;
    lng: number;
  };
  depth?: number;
  filling_level?: number;
  battery_level?: number;
  status?: BinLifecycleStatus;
};

export type Bin = {
  id: string;
  deviceUid: string | null;
  type: BinType;
  status: BinLifecycleStatus;
  depth: number;
  fill: number;
  battery: number;
  lat: number;
  lng: number;
  hasLocation: boolean;
  area: string;
  lastCollection: string;
  lastReading: string;
  notes: string;
};

export const BIN_TYPE_OPTIONS: BinType[] = [
  "general",
  "plastic",
  "paper",
  "glass",
  "organic",
  "metal",
  "electronic",
  "unknown",
];

export const CONFIGURABLE_BIN_STATUSES: BinLifecycleStatus[] = [
  "active",
  "inactive",
  "maintenance",
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const statusNotes: Record<BinLifecycleStatus, string> = {
  active: "Operational bin",
  inactive: "Temporarily disabled",
  maintenance: "Maintenance required",
  removed: "Removed from service",
  unverified: "Detected by backend, pending map configuration",
};

export const getBinStatus = (fill: number): BinFillStatus => {
  if (fill >= 80) return "full";
  if (fill >= 50) return "medium";
  return "low";
};

export const isBinMappable = (bin: Bin) =>
  bin.hasLocation && bin.status !== "unverified" && bin.status !== "removed";

export const mapBackendBinToBin = (source: BackendBin): Bin => {
  const hasLocation =
    typeof source.location?.lat === "number" && typeof source.location?.lng === "number";
  const lat = hasLocation ? source.location!.lat : 0;
  const lng = hasLocation ? source.location!.lng : 0;
  const deviceUid =
    typeof source.device_uid === "string" && source.device_uid.trim().length > 0
      ? source.device_uid
      : null;

  return {
    id: source.id,
    deviceUid,
    type: source.type ?? "unknown",
    status: source.status,
    depth: source.depth,
    fill: clamp(Math.round(source.filling_level), 0, 100),
    battery: clamp(Math.round(source.battery_level), 0, 100),
    lat,
    lng,
    hasLocation,
    area: hasLocation ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Position pending",
    lastCollection: "n/a",
    lastReading: "live API",
    notes: statusNotes[source.status],
  };
};

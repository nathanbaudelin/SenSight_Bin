export type Bin = {
  id: string;
  area: string;
  lat: number;
  lng: number;
  fill: number;
  lastCollection: string;
  deviceSsid: string | null;
  lastReading: string;
  notes: string;
};

export type BinStatus = "low" | "medium" | "full";

export const getBinStatus = (fill: number): BinStatus => {
  if (fill >= 80) return "full";
  if (fill >= 50) return "medium";
  return "low";
};

export const initialBins: Bin[] = [
  {
    id: "BCN-CT-001",
    area: "Placa Catalunya",
    lat: 41.38702,
    lng: 2.17006,
    fill: 92,
    lastCollection: "2h",
    deviceSsid: "BIN_BCN_001",
    lastReading: "just now",
    notes: "Tourist zone, high traffic",
  },
  {
    id: "BCN-GR-114",
    area: "Passeig de Gracia",
    lat: 41.39162,
    lng: 2.16494,
    fill: 81,
    lastCollection: "8h",
    deviceSsid: "BIN_BCN_014",
    lastReading: "2 min ago",
    notes: "Retail strip",
  },
  {
    id: "BCN-SF-229",
    area: "Sagrada Familia",
    lat: 41.40363,
    lng: 2.17436,
    fill: 74,
    lastCollection: "14h",
    deviceSsid: "BIN_BCN_027",
    lastReading: "3 min ago",
    notes: "Busier on weekends",
  },
  {
    id: "BCN-EL-412",
    area: "El Raval",
    lat: 41.37815,
    lng: 2.16812,
    fill: 0,
    lastCollection: "5h",
    deviceSsid: null,
    lastReading: "awaiting connection",
    notes: "Market day",
  },
  {
    id: "BCN-BN-305",
    area: "Barceloneta",
    lat: 41.37962,
    lng: 2.18964,
    fill: 0,
    lastCollection: "1d",
    deviceSsid: null,
    lastReading: "awaiting connection",
    notes: "Seaside pedestrian zone",
  },
  {
    id: "BCN-SM-188",
    area: "Sant Marti",
    lat: 41.41058,
    lng: 2.19743,
    fill: 36,
    lastCollection: "9h",
    deviceSsid: "BIN_BCN_036",
    lastReading: "5 min ago",
    notes: "Residential block",
  },
  {
    id: "BCN-LC-077",
    area: "Les Corts",
    lat: 41.3874,
    lng: 2.13023,
    fill: 0,
    lastCollection: "12h",
    deviceSsid: null,
    lastReading: "awaiting connection",
    notes: "Office district",
  },
  {
    id: "BCN-MJ-266",
    area: "Montjuic",
    lat: 41.36412,
    lng: 2.15845,
    fill: 0,
    lastCollection: "6h",
    deviceSsid: null,
    lastReading: "awaiting connection",
    notes: "Park entrance",
  },
  {
    id: "BCN-PO-352",
    area: "Poblenou",
    lat: 41.39934,
    lng: 2.20215,
    fill: 22,
    lastCollection: "4h",
    deviceSsid: "BIN_BCN_052",
    lastReading: "1 min ago",
    notes: "Tech campus",
  },
];

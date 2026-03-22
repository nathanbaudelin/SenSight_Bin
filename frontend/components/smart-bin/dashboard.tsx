"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bell,
  CheckCircle2,
  CircleAlert,
  ClipboardX,
  Loader2,
  Wifi,
  WifiOff,
  MapPinned,
  Move,
  Plus,
  Route,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Bin } from "./bin-data";
import { getBinStatus, initialBins } from "./bin-data";
import type { BinMapProps } from "./bin-map";
import SmartNav from "./smart-nav";

const BinMap = dynamic<BinMapProps>(() => import("./bin-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] w-full rounded-3xl border border-white/40 bg-white/70 shadow-xl backdrop-blur md:h-[520px]" />
  ),
});

const CENTER_BARCELONA = { lat: 41.3851, lng: 2.1734 };

type FilterKey = "all" | "full" | "medium" | "low";

type WifiNetwork = {
  id: string;
  ssid: string;
  rssi: number;
  secure: boolean;
  channel: number;
  distance: string;
};

type PendingCoords = { lat: number; lng: number };
type RouteStopPayload = { id: string; lat: number; lng: number };
type SimulatedRoutePayload = {
  routeId: string;
  provider: "simulated-backend";
  mode: "driving";
  orderedStops: RouteStopPayload[];
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "full", label: "Full > 80%" },
  { key: "medium", label: "Medium 50-80%" },
  { key: "low", label: "Low < 50%" },
];

const formatCoords = (value: number) => value.toFixed(5);

const statusLabel = (fill: number) => {
  const status = getBinStatus(fill);
  if (status === "full") return "Full";
  if (status === "medium") return "Medium";
  return "Low";
};

const statusBadgeClass = (fill: number) => {
  const status = getBinStatus(fill);
  if (status === "full") return "bg-rose-500/10 text-rose-700 border-rose-200";
  if (status === "medium") return "bg-amber-500/10 text-amber-700 border-amber-200";
  return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const rssiToPercent = (rssi: number) => clamp(Math.round((rssi + 100) * 2), 0, 100);

const displayStatusLabel = (bin: Bin) => (bin.deviceSsid ? statusLabel(bin.fill) : "Offline");

const displayStatusBadge = (bin: Bin) =>
  bin.deviceSsid ? statusBadgeClass(bin.fill) : "bg-slate-200/60 text-slate-600 border-slate-200";

const filterBins = (bins: Bin[], filter: FilterKey, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  return bins.filter((bin) => {
    const matchesQuery =
      !normalizedQuery ||
      bin.id.toLowerCase().includes(normalizedQuery) ||
      bin.area.toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (filter === "all") return true;
    if (filter === "full") return bin.fill >= 80;
    if (filter === "medium") return bin.fill >= 50 && bin.fill < 80;
    return bin.fill < 50;
  });
};

export default function SmartBinDashboard() {
  const [bins, setBins] = useState<Bin[]>(initialBins);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [wifiError, setWifiError] = useState<string | null>(null);
  const [wifiConnecting, setWifiConnecting] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingAddCoords, setPendingAddCoords] = useState<PendingCoords | null>(null);
  const [createArea, setCreateArea] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createLastCollection, setCreateLastCollection] = useState("new");
  const [createNetworks, setCreateNetworks] = useState<WifiNetwork[]>([]);
  const [createWifiScanning, setCreateWifiScanning] = useState(false);
  const [createWifiError, setCreateWifiError] = useState<string | null>(null);
  const [createWifiConnecting, setCreateWifiConnecting] = useState<string | null>(null);
  const [createSelectedNetworkId, setCreateSelectedNetworkId] = useState<string | null>(null);
  const [createLinkedSsid, setCreateLinkedSsid] = useState<string | null>(null);
  const [createInitialFill, setCreateInitialFill] = useState<number | null>(null);
  const [createLastReading, setCreateLastReading] = useState("awaiting connection");
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStopPayload[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [lastGeneratedRouteId, setLastGeneratedRouteId] = useState<string | null>(null);
  const [routeDispatching, setRouteDispatching] = useState(false);
  const [routeDispatchStatus, setRouteDispatchStatus] = useState<string | null>(null);

  const filteredBins = useMemo(() => filterBins(bins, filter, query), [bins, filter, query]);
  const connectedBins = useMemo(
    () => bins.filter((bin) => Boolean(bin.deviceSsid)).length,
    [bins]
  );
  const averageFill = useMemo(() => {
    if (!bins.length) return 0;
    return Math.round(bins.reduce((sum, bin) => sum + bin.fill, 0) / bins.length);
  }, [bins]);
  const needsCollection = useMemo(() => bins.filter((bin) => bin.fill >= 80).length, [bins]);
  const selectedBin = bins.find((bin) => bin.id === selectedId) ?? null;
  const latestReading = useMemo(() => {
    const connected = bins.filter((bin) => bin.deviceSsid);
    if (!connected.length) return "No devices linked";
    return connected
      .map((bin) => bin.lastReading)
      .find((reading) => Boolean(reading)) ?? "Live";
  }, [bins]);
  const nextBinIdPreview = useMemo(
    () => `BCN-NW-${String(bins.length + 1).padStart(3, "0")}`,
    [bins.length]
  );
  const createSelectedNetwork =
    createNetworks.find((network) => network.id === createSelectedNetworkId) ?? null;
  const routeStopsPreview = routeStops.map((stop) => stop.id);
  const hasGeneratedRoute = routeStops.length > 0 && routePath.length > 1;

  const resetCreateBinDraft = () => {
    setCreateArea("");
    setCreateNotes("");
    setCreateLastCollection("new");
    setCreateNetworks([]);
    setCreateWifiScanning(false);
    setCreateWifiError(null);
    setCreateWifiConnecting(null);
    setCreateSelectedNetworkId(null);
    setCreateLinkedSsid(null);
    setCreateInitialFill(null);
    setCreateLastReading("awaiting connection");
    setCreateFormError(null);
  };

  const buildSimulatedRoutePayload = (): SimulatedRoutePayload | null => {
    const urgentBins = bins
      .filter((bin) => bin.fill >= 50)
      .sort((a, b) => b.fill - a.fill)
      .slice(0, 4);
    const fallbackBins = bins.slice(0, 4);
    const selectedStops = (urgentBins.length >= 2 ? urgentBins : fallbackBins)
      .slice(0, 4)
      .map((bin) => ({ id: bin.id, lat: bin.lat, lng: bin.lng }));

    if (selectedStops.length < 2) return null;

    return {
      routeId: `route-${Date.now()}`,
      provider: "simulated-backend",
      mode: "driving",
      orderedStops: selectedStops,
    };
  };

  useEffect(() => {
    setWifiError(null);
    setWifiConnecting(null);
    setWifiNetworks([]);
  }, [selectedId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setBins((prev) =>
        prev.map((bin) => {
          if (!bin.deviceSsid) return bin;
          const delta = Math.round(Math.random() * 10 - 5);
          const nextFill = clamp(bin.fill + delta, 5, 98);
          return {
            ...bin,
            fill: nextFill,
            lastReading: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleAddBin = (coords: { lat: number; lng: number }) => {
    setPendingAddCoords(coords);
    resetCreateBinDraft();
    setCreateDialogOpen(true);
    setAddMode(false);
    setMoveMode(false);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setPendingAddCoords(null);
      resetCreateBinDraft();
    }
  };

  const handleCreateWifiScan = async () => {
    setCreateWifiScanning(true);
    setCreateWifiError(null);
    setCreateFormError(null);
    try {
      const response = await fetch("/api/wifi/scan", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Scan failed");
      }
      const data = await response.json();
      const networks = Array.isArray(data.networks) ? data.networks : [];
      setCreateNetworks(networks);
      if (networks.length) {
        setCreateSelectedNetworkId((prev) => prev ?? networks[0].id);
      }
    } catch (error) {
      setCreateWifiError("Unable to scan ESP32 WiFi networks.");
    } finally {
      setCreateWifiScanning(false);
    }
  };

  const handleCreateWifiConnect = async () => {
    if (!createSelectedNetwork) {
      setCreateFormError("Select an ESP32 network before connecting.");
      return;
    }
    setCreateWifiConnecting(createSelectedNetwork.ssid);
    setCreateWifiError(null);
    setCreateFormError(null);
    try {
      const response = await fetch("/api/wifi/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid: createSelectedNetwork.ssid }),
      });
      if (!response.ok) {
        throw new Error("Connection failed");
      }
      const data = (await response.json().catch(() => null)) as
        | { fill?: number; lastReading?: string }
        | null;
      const now = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setCreateLinkedSsid(createSelectedNetwork.ssid);
      setCreateInitialFill(
        typeof data?.fill === "number"
          ? clamp(Math.round(data.fill), 0, 100)
          : clamp(Math.round(Math.random() * 60 + 20), 5, 98)
      );
      setCreateLastReading(data?.lastReading ?? now);
    } catch (error) {
      setCreateWifiError("Unable to connect to the selected ESP32.");
    } finally {
      setCreateWifiConnecting(null);
    }
  };

  const handleConfirmCreateBin = () => {
    if (!pendingAddCoords) {
      setCreateFormError("Bin position not found. Click again on the map.");
      return;
    }
    if (!createArea.trim()) {
      setCreateFormError("Area is required.");
      return;
    }
    if (!createLinkedSsid) {
      setCreateFormError("You must connect an ESP32 over WiFi before creating the bin.");
      return;
    }

    const newBin: Bin = {
      id: nextBinIdPreview,
      area: createArea.trim(),
      lat: pendingAddCoords.lat,
      lng: pendingAddCoords.lng,
      fill: createInitialFill ?? 0,
      lastCollection: createLastCollection.trim() || "new",
      deviceSsid: createLinkedSsid,
      lastReading: createLastReading,
      notes: createNotes.trim() || "ESP32 linked during setup",
    };

    setBins((prev) => [newBin, ...prev]);
    setSelectedId(newBin.id);
    handleCreateDialogChange(false);
  };

  const handleGenerateRoute = async () => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteDispatchStatus(null);
    try {
      // Simulated backend response: ordered bins to visit + coordinates.
      const simulatedPayload = buildSimulatedRoutePayload();
      if (!simulatedPayload) {
        throw new Error("Not enough bins to generate a route.");
      }

      const osrmCoordinates = simulatedPayload.orderedStops
        .map((stop) => `${stop.lng},${stop.lat}`)
        .join(";");

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${osrmCoordinates}?overview=full&geometries=geojson`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("Routing provider unavailable");
      }

      const data = await response.json();
      const geometry = data?.routes?.[0]?.geometry?.coordinates;
      if (!Array.isArray(geometry) || geometry.length < 2) {
        throw new Error("Invalid route geometry");
      }

      const path = geometry
        .filter(
          (point: unknown): point is [number, number] =>
            Array.isArray(point) && point.length >= 2 && point.every((value) => typeof value === "number")
        )
        .map(([lng, lat]) => ({ lat, lng }));

      if (path.length < 2) {
        throw new Error("Empty route path");
      }

      setRoutePath(path);
      setRouteStops(simulatedPayload.orderedStops);
      setLastGeneratedRouteId(simulatedPayload.routeId);
    } catch (error) {
      setRouteError("Unable to generate route right now.");
      setRoutePath([]);
      setRouteStops([]);
    } finally {
      setRouteLoading(false);
    }
  };

  const handleCancelRoute = () => {
    setRoutePath([]);
    setRouteStops([]);
    setRouteError(null);
    setLastGeneratedRouteId(null);
    setRouteDispatchStatus(null);
  };

  const handleSendRouteToCollectionService = async () => {
    if (!lastGeneratedRouteId || routeStops.length === 0) return;
    setRouteDispatching(true);
    setRouteDispatchStatus(null);
    try {
      // Simulated backend dispatch call
      await new Promise((resolve) => setTimeout(resolve, 900));
      setRouteDispatchStatus(
        `Mission sent to collection service for ${lastGeneratedRouteId}. Team is on the way.`
      );
    } catch (error) {
      setRouteDispatchStatus("Unable to send mission to collection service.");
    } finally {
      setRouteDispatching(false);
    }
  };

  const updateSelectedBin = (patch: Partial<Bin>) => {
    if (!selectedBin) return;
    setBins((prev) =>
      prev.map((bin) => (bin.id === selectedBin.id ? { ...bin, ...patch } : bin))
    );
  };

  const confirmDeleteSelected = () => {
    if (!selectedBin) return;
    setBins((prev) => prev.filter((bin) => bin.id !== selectedBin.id));
    setSelectedId(null);
    setMoveMode(false);
    setDeleteDialogOpen(false);
  };

  const handleMoveBin = (coords: { lat: number; lng: number }) => {
    if (!selectedBin) return;
    updateSelectedBin({ lat: coords.lat, lng: coords.lng });
    setMoveMode(false);
  };

  const handleCoordChange = (field: "lat" | "lng", rawValue: string) => {
    if (!selectedBin) return;
    const value = Number(rawValue);
    if (Number.isNaN(value)) return;
    updateSelectedBin({ [field]: value } as Partial<Bin>);
  };

  const handleSelectBin = (id: string) => {
    setSelectedId(id);
    setMoveMode(false);
  };

  const handleWifiScan = async () => {
    setWifiScanning(true);
    setWifiError(null);
    try {
      const response = await fetch("/api/wifi/scan", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Scan failed");
      }
      const data = await response.json();
      setWifiNetworks(Array.isArray(data.networks) ? data.networks : []);
    } catch (error) {
      setWifiError("Unable to scan WiFi networks.");
    } finally {
      setWifiScanning(false);
    }
  };

  const handleWifiConnect = async (ssid: string) => {
    if (!selectedBin) return;
    setWifiConnecting(ssid);
    setWifiError(null);
    try {
      const response = await fetch("/api/wifi/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid }),
      });
      if (!response.ok) {
        throw new Error("Connection failed");
      }
      updateSelectedBin({
        deviceSsid: ssid,
        fill: clamp(Math.round(Math.random() * 60 + 20), 5, 98),
        lastReading: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    } catch (error) {
      setWifiError("Unable to connect to the selected bin.");
    } finally {
      setWifiConnecting(null);
    }
  };

  const handleWifiDisconnect = () => {
    if (!selectedBin) return;
    updateSelectedBin({
      deviceSsid: null,
      fill: 0,
      lastReading: "awaiting connection",
    });
  };

  const alerts = bins
    .filter((bin) => bin.fill >= 80)
    .slice(0, 3)
    .map((bin, index) => ({
      id: `${bin.id}-${index}`,
      title: `${bin.id} Full`,
      time: `${(index + 1) * 4} min`,
      body: `${bin.area} - ${bin.fill}% full`,
      tone: "critical" as const,
    }));

  const supplementalAlert = {
    id: "route-opt",
    title: "Route optimization",
    time: "20 min",
    body: "7 bins need pickup in Eixample. Route saves 24% fuel.",
    tone: "warning" as const,
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900">
      <SmartNav />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-[-180px] h-[420px] w-[420px] rounded-full bg-emerald-200/50 blur-[120px]" />
          <div className="absolute right-[-120px] top-[120px] h-[360px] w-[360px] rounded-full bg-amber-200/50 blur-[120px]" />
          <div className="absolute bottom-[-200px] left-[30%] h-[420px] w-[420px] rounded-full bg-sky-200/40 blur-[140px]" />
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 pb-20 pt-10">
          <section id="overview" className="space-y-4 scroll-mt-28">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-start">
              <div className="space-y-4">
                <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <MapPinned className="h-3.5 w-3.5" />
                  Active coverage - Barcelona
                </div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                  SenSight Bin Control Center
                </h1>
                <p className="max-w-xl text-base text-slate-600 md:text-lg">
                  IoT prototype for connected smart bins. Track fill levels, plan collections, and
                  trigger optimized routes across the city.
                </p>
              </div>
              <div className="w-full rounded-3xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur lg:max-w-sm lg:justify-self-end">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Connected bins</div>
                    <div className="text-2xl font-semibold">{connectedBins} / {bins.length}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 space-y-2.5 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Latest sensor sync</span>
                    <span className="font-semibold text-slate-900">{latestReading}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>AI load prediction</span>
                    <span className="font-semibold text-slate-900">87% accuracy</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Average collection time</span>
                    <span className="font-semibold text-slate-900">23 min</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="stats" className="grid gap-6 scroll-mt-28 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
              <div className="text-sm text-slate-500">Total bins</div>
              <div className="mt-4 text-3xl font-semibold">{bins.length}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +3 this week
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
              <div className="text-sm text-slate-500">Needs pickup</div>
              <div className="mt-4 text-3xl font-semibold">{needsCollection}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-rose-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +2 since yesterday
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
              <div className="text-sm text-slate-500">Average fill</div>
              <div className="mt-4 text-3xl font-semibold">{averageFill}%</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                <TrendingDown className="h-3.5 w-3.5" />
                -4% this week
              </div>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg backdrop-blur">
              <div className="text-sm text-slate-500">Monthly savings</div>
              <div className="mt-4 text-3xl font-semibold">EUR 8,120</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +18% vs last month
              </div>
            </div>
          </section>

          <section id="map" className="grid gap-6 scroll-mt-28 lg:grid-cols-[2.2fr_1fr]">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Bin map</h2>
                    <p className="text-sm text-slate-500">Click a bin to see details.</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {FILTERS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFilter(item.key)}
                        className={cn(
                          "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition",
                          filter === item.key && "border-slate-900 bg-slate-900 text-white"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="ml-2 flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() =>
                        setAddMode((prev) => {
                          const next = !prev;
                          if (next) setMoveMode(false);
                          return next;
                        })
                      }
                      size="sm"
                      className={cn(
                        "rounded-full bg-slate-900 text-white hover:bg-slate-800",
                        addMode && "bg-emerald-600 hover:bg-emerald-600"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      {addMode ? "Add mode active" : "Add a bin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={hasGeneratedRoute ? "default" : "outline"}
                      className={cn(
                        "rounded-full",
                        hasGeneratedRoute
                          ? "border border-amber-400 bg-white text-amber-500 hover:bg-amber-50"
                          : "border-slate-200 bg-white"
                      )}
                      onClick={handleGenerateRoute}
                      disabled={routeLoading}
                    >
                      <Route className="h-4 w-4" />
                      {routeLoading
                        ? "Generating..."
                        : hasGeneratedRoute
                        ? "Re-Generate route"
                        : "Generate route"}
                    </Button>
                  </div>
                </div>
              </div>
              {(routeError || routeStopsPreview.length > 0 || routeLoading) && (
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
                  {routeError ? (
                    <span className="text-rose-600">{routeError}</span>
                  ) : routeLoading ? (
                    <span>Simulating backend response and computing road route...</span>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              Route {lastGeneratedRouteId ?? ""}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>Start:</span>
                            <span className="font-semibold text-slate-900">
                              {routeStopsPreview[0] ?? "-"}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>End:</span>
                            <span className="font-semibold text-slate-900">
                              {routeStopsPreview[routeStopsPreview.length - 1] ?? "-"}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>Order:</span>
                          </div>
                          <div className="font-semibold text-slate-900">{routeStopsPreview.join(" -> ")}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                          <Button
                            size="sm"
                            className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
                            onClick={handleCancelRoute}
                          >
                            Cancel route
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full bg-emerald-500 text-white hover:bg-emerald-600"
                            onClick={handleSendRouteToCollectionService}
                            disabled={routeDispatching}
                          >
                            {routeDispatching ? "Sending..." : "Send to collection service"}
                          </Button>
                        </div>
                      </div>
                      {routeDispatchStatus && (
                        <div className="text-[11px] font-semibold text-emerald-700">
                          {routeDispatchStatus}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                {addMode && (
                  <div className="absolute left-4 top-4 z-[1000] rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow">
                    Click the map to add a bin
                  </div>
                )}
                {moveMode && selectedBin && (
                  <div className="absolute left-4 top-14 z-[1000] rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                    Click the map to reposition {selectedBin.id}
                  </div>
                )}
                <BinMap
                  bins={filteredBins}
                  center={CENTER_BARCELONA}
                  addMode={addMode}
                  moveMode={moveMode}
                  selectedId={selectedId}
                  routePath={routePath}
                  routeStops={routeStops}
                  onAdd={handleAddBin}
                  onMove={handleMoveBin}
                  onSelect={handleSelectBin}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span>Low &lt; 50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span>Medium 50-80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Full &gt; 80%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div
                id="alerts"
                className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur scroll-mt-28"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Recent alerts</h3>
                  <Bell className="h-4 w-4 text-slate-500" />
                </div>
                <div className="mt-4 space-y-3">
                  {[...alerts, supplementalAlert].map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-2xl border p-3 text-sm",
                        alert.tone === "critical"
                          ? "border-rose-200 bg-rose-50/70 text-rose-700"
                          : "border-amber-200 bg-amber-50/70 text-amber-700"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CircleAlert className="h-4 w-4" />
                        <span className="font-semibold">{alert.title}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{alert.time}</div>
                      <p className="mt-2 text-xs text-slate-600">{alert.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur">
                <h3 className="text-base font-semibold">Selected bin</h3>
                {selectedBin ? (
                  <div className="mt-4 space-y-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>ID</span>
                      <span className="font-semibold text-slate-900">{selectedBin.id}</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Area</label>
                      <input
                        value={selectedBin.area}
                        onChange={(event) => updateSelectedBin({ area: event.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                      <label className="text-xs text-slate-500">Latitude</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={selectedBin.lat}
                          onChange={(event) => handleCoordChange("lat", event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                      <label className="text-xs text-slate-500">Longitude</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={selectedBin.lng}
                          onChange={(event) => handleCoordChange("lng", event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span>Sensor fill level</span>
                        <span className="font-semibold text-slate-900">
                          {selectedBin.deviceSsid ? `${selectedBin.fill}%` : "Awaiting connection"}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            selectedBin.fill >= 80
                              ? "bg-rose-500"
                              : selectedBin.fill >= 50
                              ? "bg-amber-400"
                              : "bg-emerald-500"
                          )}
                          style={{ width: `${selectedBin.deviceSsid ? selectedBin.fill : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {selectedBin.deviceSsid ? (
                            <Wifi className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="font-semibold text-slate-900">
                            {selectedBin.deviceSsid ?? "No device linked"}
                          </span>
                        </div>
                        {selectedBin.deviceSsid && (
                          <button
                            type="button"
                            onClick={handleWifiDisconnect}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                          >
                            Disconnect
                          </button>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Last reading</span>
                        <span className="font-semibold text-slate-700">{selectedBin.lastReading}</span>
                      </div>
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">Link to device WiFi</div>
                            <div className="text-[11px] text-slate-500">Scan and connect this bin.</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full border-slate-200 bg-white"
                            onClick={handleWifiScan}
                            disabled={wifiScanning}
                          >
                            {wifiScanning ? "Scanning..." : "Scan WiFi"}
                          </Button>
                        </div>
                        {wifiError && (
                          <div className="mt-2 text-[11px] text-rose-600">{wifiError}</div>
                        )}
                        <div className="mt-2 space-y-2">
                          {wifiNetworks.length === 0 && !wifiScanning ? (
                            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-[11px] text-slate-500">
                              No nearby devices detected yet.
                            </div>
                          ) : (
                            wifiNetworks.map((network) => (
                              <div
                                key={network.id}
                                className={cn(
                                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-2 py-2 text-[11px]",
                                  selectedBin.deviceSsid === network.ssid
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-slate-200 bg-white"
                                )}
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">{network.ssid}</div>
                                  <div className="text-[10px] text-slate-500">
                                    Ch {network.channel} · {network.distance} · {network.secure ? "Secure" : "Open"}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {rssiToPercent(network.rssi)}%
                                  </span>
                                  <Button
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => handleWifiConnect(network.ssid)}
                                    disabled={
                                      wifiConnecting === network.ssid ||
                                      selectedBin.deviceSsid === network.ssid
                                    }
                                  >
                                    {selectedBin.deviceSsid === network.ssid
                                      ? "Linked"
                                      : wifiConnecting === network.ssid
                                      ? "Linking"
                                      : "Link"}
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Last collection</label>
                        <input
                          value={selectedBin.lastCollection}
                          onChange={(event) =>
                            updateSelectedBin({ lastCollection: event.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Status</label>
                        <Badge className={cn("border", displayStatusBadge(selectedBin))}>
                          {displayStatusLabel(selectedBin)}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Notes</label>
                      <textarea
                        rows={2}
                        value={selectedBin.notes}
                        onChange={(event) => updateSelectedBin({ notes: event.target.value })}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("rounded-full border-slate-200 bg-white", moveMode && "border-slate-900")}
                        onClick={() =>
                          setMoveMode((prev) => {
                            const next = !prev;
                            if (next) setAddMode(false);
                            return next;
                          })
                        }
                      >
                        <Move className="h-4 w-4" />
                        {moveMode ? "Click the map" : "Reposition"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                    <Button size="sm" className="w-full rounded-full">
                      Schedule pickup
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-500">
                    Click a bin on the map to view details.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            id="bins"
            className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur scroll-mt-28"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">All bins</h2>
                <p className="text-sm text-slate-500">Live list with fill levels.</p>
              </div>
              <input
                type="search"
                placeholder="Search by ID or area"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3">Bin ID</th>
                    <th className="py-3">Area</th>
                    <th className="py-3">Coordinates</th>
                    <th className="py-3">Fill level</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Last collection</th>
                    <th className="py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBins.map((bin) => (
                    <tr
                      key={bin.id}
                      className={cn(
                        "transition hover:bg-slate-50",
                        selectedId === bin.id && "bg-emerald-50/60"
                      )}
                      onClick={() => handleSelectBin(bin.id)}
                    >
                      <td className="py-4 font-semibold text-slate-900">{bin.id}</td>
                      <td className="py-4 text-slate-600">{bin.area}</td>
                      <td className="py-4 text-slate-600">
                        {formatCoords(bin.lat)}, {formatCoords(bin.lng)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-24 rounded-full bg-slate-100">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                bin.fill >= 80
                                  ? "bg-rose-500"
                                  : bin.fill >= 50
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                              )}
                              style={{ width: `${bin.fill}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{bin.fill}%</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge className={cn("border", displayStatusBadge(bin))}>
                          {displayStatusLabel(bin)}
                        </Badge>
                      </td>
                      <td className="py-4 text-slate-600">{bin.lastCollection}</td>
                      <td className="py-4">
                        <Button size="sm" variant="outline" className="rounded-full border-slate-200 bg-white">
                          Schedule
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Create a new smart bin</DialogTitle>
            <DialogDescription>
              Fill in the basic details, then connect the ESP32 over WiFi to fetch the first
              sensor data.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Placement map
                </div>
                <div className="mt-3 grid gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Bin ID (auto)</label>
                    <Input value={nextBinIdPreview} readOnly className="rounded-xl bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Latitude</label>
                      <Input
                        value={
                          pendingAddCoords ? formatCoords(pendingAddCoords.lat) : "Not selected"
                        }
                        readOnly
                        className="rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Longitude</label>
                      <Input
                        value={
                          pendingAddCoords ? formatCoords(pendingAddCoords.lng) : "Not selected"
                        }
                        readOnly
                        className="rounded-xl bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Area *</label>
                  <Input
                    value={createArea}
                    onChange={(event) => {
                      setCreateArea(event.target.value);
                      setCreateFormError(null);
                    }}
                    placeholder="Ex: Eixample - Carrer de Mallorca"
                    className="rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Last collection</label>
                  <Input
                    value={createLastCollection}
                    onChange={(event) => setCreateLastCollection(event.target.value)}
                    placeholder="new"
                    className="rounded-xl border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Notes</label>
                  <textarea
                    rows={3}
                    value={createNotes}
                    onChange={(event) => setCreateNotes(event.target.value)}
                    placeholder="Installation notes, area constraints, etc."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">ESP32 WiFi setup</div>
                  <div className="text-xs text-slate-500">
                    Scan, select an ESP32 network, then connect it.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white"
                  onClick={handleCreateWifiScan}
                  disabled={createWifiScanning}
                >
                  {createWifiScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  {createWifiScanning ? "Scanning..." : "Scan WiFi"}
                </Button>
              </div>

              {createWifiError && <div className="text-xs text-rose-600">{createWifiError}</div>}

              <div className="space-y-2">
                {createNetworks.length === 0 && !createWifiScanning ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                    No network detected yet. Run a scan to find the ESP32.
                  </div>
                ) : (
                  createNetworks.map((network) => {
                    const isSelected = createSelectedNetworkId === network.id;
                    const isLinked = createLinkedSsid === network.ssid;
                    return (
                      <button
                        key={network.id}
                        type="button"
                        onClick={() => {
                          setCreateSelectedNetworkId(network.id);
                          setCreateFormError(null);
                        }}
                        className={cn(
                          "w-full rounded-2xl border p-3 text-left transition",
                          isLinked
                            ? "border-emerald-200 bg-emerald-50"
                            : isSelected
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-900">{network.ssid}</div>
                            <div className="text-[11px] text-slate-500">
                              Ch {network.channel} · {network.distance} ·{" "}
                              {network.secure ? "Secure" : "Open"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <span>{rssiToPercent(network.rssi)}%</span>
                            {isLinked && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-slate-600">
                    {createLinkedSsid ? (
                      <>
                        <span className="font-semibold text-emerald-700">ESP32 linked:</span>{" "}
                        {createLinkedSsid}
                      </>
                    ) : (
                      "No ESP32 connected for this new bin."
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-slate-200 bg-white"
                    onClick={handleCreateWifiConnect}
                    disabled={!createSelectedNetwork || !!createWifiConnecting}
                  >
                    {createWifiConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting
                      </>
                    ) : (
                      <>
                        <Wifi className="h-4 w-4" />
                        Connect & fetch
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-500">Initial fill</span>
                    <div className="font-semibold text-slate-900">
                      {createInitialFill !== null ? `${createInitialFill}%` : "Not fetched"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-slate-500">Last reading</span>
                    <div className="font-semibold text-slate-900">{createLastReading}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {createFormError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {createFormError}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full border-slate-200 bg-white"
              onClick={() => handleCreateDialogChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-slate-200 bg-white"
              onClick={handleConfirmCreateBin}
              disabled={!pendingAddCoords || !createArea.trim() || !createLinkedSsid}
            >
              Create bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this bin?</DialogTitle>
            <DialogDescription>
              This will permanently remove {selectedBin?.id ?? "this bin"} from the map and list.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <ClipboardX className="h-4 w-4" />
            This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={confirmDeleteSelected}>
              Delete bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

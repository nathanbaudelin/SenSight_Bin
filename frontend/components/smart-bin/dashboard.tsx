"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  ClipboardX,
  Loader2,
  MousePointerClick,
  Move,
  Plus,
  RefreshCcw,
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
import type {
  BackendBin,
  Bin,
  BinLifecycleStatus,
  BinType,
  BinUpdatePayload,
} from "./bin-data";
import {
  BIN_TYPE_OPTIONS,
  CONFIGURABLE_BIN_STATUSES,
  getBinStatus,
  isBinMappable,
  mapBackendBinToBin,
} from "./bin-data";
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
type BinsListScope = "active" | "unverified";
type MapTypeFilter =
  | "all"
  | "general"
  | "plastic-metal"
  | "paper"
  | "glass"
  | "organic"
  | "electronic"
  | "unknown";
type PendingCoords = { lat: number; lng: number };
type RouteStopPayload = { id: string; lat: number; lng: number };
type SimulatedRoutePayload = {
  routeId: string;
  provider: "simulated-backend";
  mode: "driving";
  typeFilter: MapTypeFilter;
  scheduledStartAt: string;
  orderedStops: RouteStopPayload[];
};
type AlertTypeValue =
  | "overflow"
  | "low_battery"
  | "sensor_failure"
  | "sensor_inactive"
  | "abnormal_fill_rate";
type AlertStatusValue = "open" | "acknowledged" | "resolved";
type AlertListFilter = "open" | "seen" | "old";

type BackendAlert = {
  id: string;
  bin_id: string;
  type: AlertTypeValue;
  message: string;
  status: AlertStatusValue;
  timestamp: string;
};

type ApiResponse<T> = {
  status?: string;
  message?: string;
  data?: T;
};

type BinsPagePayload = {
  data: BackendBin[];
  total: number;
  page: number;
  lastPage: number;
};

type AlertsPagePayload = {
  data: BackendAlert[];
  total: number;
  page: number;
  lastPage: number;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "full", label: "Full > 80%" },
  { key: "medium", label: "Medium 50-80%" },
  { key: "low", label: "Low < 50%" },
];
const ALERT_FETCH_LIMIT = 100;
const ALERT_LIST_FILTER_OPTIONS: { value: AlertListFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "seen", label: "Seen" },
  { value: "old", label: "Old alerts" },
];

const EDITABLE_BIN_STATUSES: BinLifecycleStatus[] = [
  "active",
  "inactive",
  "maintenance",
  "unverified",
];

const typeLabels: Record<BinType, string> = {
  general: "General",
  plastic: "Plastic",
  paper: "Paper",
  glass: "Glass",
  organic: "Organic",
  metal: "Metal",
  electronic: "Electronic",
  unknown: "Unknown",
};

const MAP_TYPE_FILTER_OPTIONS: { value: MapTypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "general", label: "General" },
  { value: "plastic-metal", label: "Plastic & Metal" },
  { value: "paper", label: "Paper" },
  { value: "glass", label: "Glass" },
  { value: "organic", label: "Organic" },
  { value: "electronic", label: "Electronic" },
  { value: "unknown", label: "Unknown" },
];

const ROUTE_TYPE_OPTIONS = MAP_TYPE_FILTER_OPTIONS.filter((option) => option.value !== "all");

const getTypeCategory = (type: BinType): Exclude<MapTypeFilter, "all"> => {
  if (type === "plastic" || type === "metal") return "plastic-metal";
  return type;
};

const getTypeCategoryLabel = (type: BinType) => {
  if (type === "plastic" || type === "metal") return "Plastic & Metal";
  return typeLabels[type];
};

const matchesMapTypeFilter = (bin: Bin, mapTypeFilter: MapTypeFilter) => {
  if (mapTypeFilter === "all") return true;
  return getTypeCategory(bin.type) === mapTypeFilter;
};

const toDateTimeLocalInputValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
};

const getCurrentDateInputValue = () => toDateTimeLocalInputValue(new Date()).slice(0, 10);
const getCurrentTimeInputValue = () => toDateTimeLocalInputValue(new Date()).slice(11, 16);

const formatDateTimeForDisplay = (raw: string | null) => {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString();
};

const statusLabels: Record<BinLifecycleStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  maintenance: "Maintenance",
  unverified: "Unverified",
  removed: "Removed",
};
const alertTypeLabels: Record<AlertTypeValue, string> = {
  overflow: "Overflow",
  low_battery: "Low battery",
  sensor_failure: "Sensor failure",
  sensor_inactive: "Sensor inactive",
  abnormal_fill_rate: "Abnormal fill rate",
};

const alertStatusLabels: Record<AlertStatusValue, string> = {
  open: "Open",
  acknowledged: "Seen",
  resolved: "Resolved",
};
const alertCheckIconBaseClass =
  "inline-flex size-8 min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full aspect-square";

const statusBadgeClass = (status: BinLifecycleStatus) => {
  if (status === "active") return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
  if (status === "inactive") return "bg-slate-500/10 text-slate-700 border-slate-300";
  if (status === "maintenance") return "bg-amber-500/10 text-amber-700 border-amber-200";
  if (status === "unverified") return "bg-sky-500/10 text-sky-700 border-sky-200";
  return "bg-rose-500/10 text-rose-700 border-rose-200";
};

const fillBarClass = (fill: number) => {
  const status = getBinStatus(fill);
  if (status === "full") return "bg-rose-500";
  if (status === "medium") return "bg-amber-400";
  return "bg-emerald-500";
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatCoords = (value: number) => value.toFixed(5);
const getCoordinatesLabel = (bin: Bin) =>
  bin.hasLocation ? `${formatCoords(bin.lat)}, ${formatCoords(bin.lng)}` : "Not configured";
const parseApiMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};
const toNumberOrNull = (rawValue: string) => {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAlertCardToneClass = (alert: BackendAlert) => {
  if (alert.status === "resolved") return "border-l-slate-300 bg-slate-50/60 text-slate-700";
  if (alert.type === "overflow" || alert.type === "sensor_failure") {
    return "border-l-rose-400 bg-rose-50/65 text-rose-700";
  }
  return "border-l-amber-400 bg-amber-50/55 text-amber-700";
};

const formatAlertTimeAgo = (rawTimestamp: string) => {
  const parsed = new Date(rawTimestamp);
  if (Number.isNaN(parsed.getTime())) return rawTimestamp;

  const diffMs = Date.now() - parsed.getTime();
  if (diffMs < 60_000) return "just now";

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d ago`;
};

const sectionReveal = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const filterBins = (bins: Bin[], filter: FilterKey, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  return bins.filter((bin) => {
    const typeLabel = getTypeCategoryLabel(bin.type).toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      bin.id.toLowerCase().includes(normalizedQuery) ||
      bin.type.toLowerCase().includes(normalizedQuery) ||
      typeLabel.includes(normalizedQuery) ||
      bin.status.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) return false;
    if (filter === "all") return true;
    if (filter === "full") return bin.fill >= 80;
    if (filter === "medium") return bin.fill >= 50 && bin.fill < 80;
    return bin.fill < 50;
  });
};

export default function SmartBinDashboard() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [binsLoading, setBinsLoading] = useState(true);
  const [binsRefreshing, setBinsRefreshing] = useState(false);
  const [binsError, setBinsError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [savingBinId, setSavingBinId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [mapTypeFilter, setMapTypeFilter] = useState<MapTypeFilter>("all");
  const [binsListScope, setBinsListScope] = useState<BinsListScope>("active");
  const [query, setQuery] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [pendingAddCoords, setPendingAddCoords] = useState<PendingCoords | null>(null);
  const [createSelectedBinId, setCreateSelectedBinId] = useState<string | null>(null);
  const [createType, setCreateType] = useState<BinType>("unknown");
  const [createDepth, setCreateDepth] = useState("100");
  const [createStatus, setCreateStatus] = useState<BinLifecycleStatus>("active");
  const [createFormError, setCreateFormError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStopPayload[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [lastGeneratedRouteId, setLastGeneratedRouteId] = useState<string | null>(null);
  const [lastRouteTypeFilter, setLastRouteTypeFilter] = useState<MapTypeFilter>("all");
  const [lastRouteScheduledStartAt, setLastRouteScheduledStartAt] = useState<string | null>(null);
  const [routeDispatching, setRouteDispatching] = useState(false);
  const [routeDispatchStatus, setRouteDispatchStatus] = useState<string | null>(null);
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [routeDialogTypeFilter, setRouteDialogTypeFilter] = useState<MapTypeFilter | "">("");
  const [routeDialogDate, setRouteDialogDate] = useState("");
  const [routeDialogTime, setRouteDialogTime] = useState("");
  const [routeDialogError, setRouteDialogError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<BackendAlert[]>([]);
  const [alertsFilter, setAlertsFilter] = useState<AlertListFilter>("open");
  const [alertsCounts, setAlertsCounts] = useState<Record<AlertListFilter, number>>({
    open: 0,
    seen: 0,
    old: 0,
  });
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);

  const filteredBins = useMemo(() => filterBins(bins, filter, query), [bins, filter, query]);
  const mapBins = useMemo(
    () =>
      filteredBins.filter(
        (bin) => isBinMappable(bin) && matchesMapTypeFilter(bin, mapTypeFilter)
      ),
    [filteredBins, mapTypeFilter]
  );
  const binsForTable = useMemo(() => {
    if (binsListScope === "active") {
      return filteredBins.filter((bin) => bin.status === "active");
    }
    return filteredBins.filter((bin) => bin.status === "unverified");
  }, [filteredBins, binsListScope]);
  const unverifiedBins = useMemo(
    () => bins.filter((bin) => bin.status === "unverified"),
    [bins]
  );

  const connectedBins = useMemo(
    () => bins.filter((bin) => bin.status === "active").length,
    [bins]
  );

  const averageFill = useMemo(() => {
    if (!bins.length) return 0;
    return Math.round(bins.reduce((sum, bin) => sum + bin.fill, 0) / bins.length);
  }, [bins]);

  const needsCollection = useMemo(
    () => bins.filter((bin) => bin.status === "active" && bin.fill >= 80).length,
    [bins]
  );

  const selectedBin = useMemo(
    () => bins.find((bin) => bin.id === selectedId) ?? null,
    [bins, selectedId]
  );

  const createSelectedBin = useMemo(
    () => unverifiedBins.find((bin) => bin.id === createSelectedBinId) ?? null,
    [unverifiedBins, createSelectedBinId]
  );

  const latestReading = useMemo(() => {
    if (binsLoading) return "Syncing...";
    if (!bins.length) return "No data";
    return "Live API";
  }, [bins.length, binsLoading]);

  const routeStopsPreview = routeStops.map((stop) => stop.id);
  const hasGeneratedRoute = routeStops.length > 0 && routePath.length > 1;
  const routeStartLabel = useMemo(
    () => formatDateTimeForDisplay(lastRouteScheduledStartAt),
    [lastRouteScheduledStartAt]
  );
  const routeTypeLabel = useMemo(
    () => MAP_TYPE_FILTER_OPTIONS.find((option) => option.value === lastRouteTypeFilter)?.label ?? "All types",
    [lastRouteTypeFilter]
  );
  const handleBinsListScopeChange = (scope: BinsListScope) => {
    setBinsListScope((currentScope) => (currentScope === scope ? currentScope : scope));
  };

  const loadBins = useCallback(
    async (silent = false) => {
      if (silent) {
        setBinsRefreshing(true);
      } else {
        setBinsLoading(true);
      }
      setBinsError(null);

      try {
        const response = await fetch("/api/bins?limit=100", { cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as ApiResponse<BinsPagePayload> | null;

        if (!response.ok) {
          throw new Error(parseApiMessage(payload, "Unable to load bins from backend."));
        }

        const backendBins = Array.isArray(payload?.data?.data) ? payload.data.data : [];
        const mapped = backendBins.map(mapBackendBinToBin);
        setBins(mapped);

        setSelectedId((currentSelectedId) => {
          if (!currentSelectedId) return currentSelectedId;
          return mapped.some((bin) => bin.id === currentSelectedId) ? currentSelectedId : null;
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load bins from backend.";
        setBinsError(message);
      } finally {
        if (silent) {
          setBinsRefreshing(false);
        } else {
          setBinsLoading(false);
        }
      }
    },
    []
  );

  const fetchAlertsByStatus = useCallback(
    async (status: AlertStatusValue, limit = ALERT_FETCH_LIMIT) => {
      const response = await fetch(
        `/api/alerts?status=${encodeURIComponent(status)}&limit=${limit}`,
        { cache: "no-store" }
      );
      const payload = (await response.json().catch(() => null)) as ApiResponse<AlertsPagePayload> | null;

      if (!response.ok) {
        throw new Error(parseApiMessage(payload, `Unable to load ${status} alerts.`));
      }

      const fetchedAlerts = Array.isArray(payload?.data?.data) ? payload.data.data : [];
      const total = typeof payload?.data?.total === "number" ? payload.data.total : fetchedAlerts.length;
      return { alerts: fetchedAlerts, total };
    },
    []
  );

  const loadAlerts = useCallback(
    async (filterValue: AlertListFilter, silent = false) => {
      if (!silent) setAlertsLoading(true);
      setAlertsError(null);

      try {
        const [openCountPayload, seenCountPayload, resolvedCountPayload] = await Promise.all([
          fetchAlertsByStatus("open", 1),
          fetchAlertsByStatus("acknowledged", 1),
          fetchAlertsByStatus("resolved", 1),
        ]);

        setAlertsCounts({
          open: openCountPayload.total,
          seen: seenCountPayload.total,
          old: seenCountPayload.total + resolvedCountPayload.total,
        });

        let fetchedAlerts: BackendAlert[] = [];

        if (filterValue === "open") {
          const payload = await fetchAlertsByStatus("open");
          fetchedAlerts = payload.alerts;
        } else if (filterValue === "seen") {
          const payload = await fetchAlertsByStatus("acknowledged");
          fetchedAlerts = payload.alerts;
        } else {
          const [acknowledgedAlerts, resolvedAlerts] = await Promise.all([
            fetchAlertsByStatus("acknowledged"),
            fetchAlertsByStatus("resolved"),
          ]);

          fetchedAlerts = [...acknowledgedAlerts.alerts, ...resolvedAlerts.alerts]
            .sort((left, right) => {
              const leftTimestamp = new Date(left.timestamp).getTime();
              const rightTimestamp = new Date(right.timestamp).getTime();
              const safeLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
              const safeRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
              return safeRight - safeLeft;
            });
        }

        setAlerts(fetchedAlerts);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load alerts from backend.";
        setAlertsError(message);
      } finally {
        if (!silent) setAlertsLoading(false);
      }
    },
    [fetchAlertsByStatus]
  );

  const handleMarkAlertAsSeen = useCallback(
    async (alertId: string) => {
      setUpdatingAlertId(alertId);
      setAlertsError(null);

      try {
        const response = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "acknowledged" as AlertStatusValue }),
        });

        const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

        if (!response.ok) {
          throw new Error(parseApiMessage(payload, `Unable to update alert ${alertId}.`));
        }

        await loadAlerts(alertsFilter, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unable to update alert ${alertId}.`;
        setAlertsError(message);
      } finally {
        setUpdatingAlertId(null);
      }
    },
    [alertsFilter, loadAlerts]
  );

  useEffect(() => {
    void loadBins();

    const refreshInterval = setInterval(() => {
      void loadBins(true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [loadBins]);

  useEffect(() => {
    void loadAlerts(alertsFilter);

    const refreshInterval = setInterval(() => {
      void loadAlerts(alertsFilter, true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [alertsFilter, loadAlerts]);

  useEffect(() => {
    if (!createDialogOpen) return;

    if (!unverifiedBins.length) {
      setCreateSelectedBinId(null);
      return;
    }

    setCreateSelectedBinId((current) => {
      if (current && unverifiedBins.some((bin) => bin.id === current)) return current;
      return unverifiedBins[0].id;
    });
  }, [createDialogOpen, unverifiedBins]);

  useEffect(() => {
    if (!createDialogOpen || !createSelectedBin) return;

    setCreateType(createSelectedBin.type);
    setCreateDepth(String(createSelectedBin.depth));
    setCreateStatus(
      createSelectedBin.status === "inactive" || createSelectedBin.status === "maintenance"
        ? createSelectedBin.status
        : "active"
    );
  }, [createDialogOpen, createSelectedBin]);

  useEffect(() => {
    if (!routeDialogOpen) return;
    if (!routeDialogDate) {
      setRouteDialogDate(getCurrentDateInputValue());
    }
    if (!routeDialogTime) {
      setRouteDialogTime(getCurrentTimeInputValue());
    }
  }, [routeDialogDate, routeDialogOpen, routeDialogTime]);

  const resetCreateDraft = () => {
    setCreateSelectedBinId(null);
    setCreateType("unknown");
    setCreateDepth("100");
    setCreateStatus("active");
    setCreateFormError(null);
    setCreateSaving(false);
  };

  const handleAddBin = (coords: { lat: number; lng: number }) => {
    setPendingAddCoords(coords);
    setCreateFormError(null);
    setCreateDialogOpen(true);
    setAddMode(false);
    setMoveMode(false);
  };

  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      setPendingAddCoords(null);
      resetCreateDraft();
    }
  };

  const updateSelectedBin = (patch: Partial<Bin>) => {
    if (!selectedBin) return;

    setBins((previousBins) =>
      previousBins.map((bin) => {
        if (bin.id !== selectedBin.id) return bin;

        const next = { ...bin, ...patch };

        if ("lat" in patch || "lng" in patch || "hasLocation" in patch) {
          const hasLocation =
            typeof next.lat === "number" &&
            Number.isFinite(next.lat) &&
            typeof next.lng === "number" &&
            Number.isFinite(next.lng) &&
            next.hasLocation;

          next.hasLocation = hasLocation;
          next.area = hasLocation ? `${next.lat.toFixed(4)}, ${next.lng.toFixed(4)}` : "Position pending";
        }

        next.fill = clamp(next.fill, 0, 100);
        next.battery = clamp(next.battery, 0, 100);

        return next;
      })
    );
  };

  const persistBinPatch = useCallback(
    async (binId: string, payload: BinUpdatePayload) => {
      setSavingBinId(binId);
      setMutationError(null);

      try {
        const response = await fetch(`/api/bins/${encodeURIComponent(binId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

        if (!response.ok) {
          throw new Error(parseApiMessage(data, `Unable to update bin ${binId}.`));
        }

        await loadBins(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : `Unable to update bin ${binId}.`;
        setMutationError(message);
        throw error;
      } finally {
        setSavingBinId(null);
      }
    },
    [loadBins]
  );

  const handleConfirmCreateBin = async () => {
    if (!pendingAddCoords) {
      setCreateFormError("Bin position not found. Click on the map again.");
      return;
    }

    if (!createSelectedBinId) {
      setCreateFormError("No unverified bin available to configure.");
      return;
    }

    const parsedDepth = toNumberOrNull(createDepth);
    if (parsedDepth === null || parsedDepth <= 0) {
      setCreateFormError("Depth must be a positive number.");
      return;
    }

    setCreateSaving(true);
    setCreateFormError(null);

    try {
      await persistBinPatch(createSelectedBinId, {
        type: createType,
        status: createStatus,
        depth: parsedDepth,
        location: {
          lat: pendingAddCoords.lat,
          lng: pendingAddCoords.lng,
        },
      });

      setSelectedId(createSelectedBinId);
      handleCreateDialogChange(false);
    } catch {
      setCreateFormError("Unable to configure this bin right now.");
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedBin) return;

    setSavingBinId(selectedBin.id);
    setMutationError(null);

    try {
      const response = await fetch(`/api/bins/${encodeURIComponent(selectedBin.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(parseApiMessage(payload, `Unable to delete bin ${selectedBin.id}.`));
      }

      setDeleteDialogOpen(false);
      setMoveMode(false);
      setSelectedId(null);
      await loadBins(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to delete bin ${selectedBin.id}.`;
      setMutationError(message);
    } finally {
      setSavingBinId(null);
    }
  };

  const handleSaveSelectedBin = async () => {
    if (!selectedBin) return;

    const payload: BinUpdatePayload = {
      type: selectedBin.type,
      status: selectedBin.status,
      depth: selectedBin.depth,
      filling_level: clamp(Math.round(selectedBin.fill), 0, 100),
      battery_level: clamp(Math.round(selectedBin.battery), 0, 100),
    };

    if (selectedBin.hasLocation) {
      payload.location = {
        lat: selectedBin.lat,
        lng: selectedBin.lng,
      };
    }

    await persistBinPatch(selectedBin.id, payload);
  };

  const handleMoveBin = (coords: { lat: number; lng: number }) => {
    if (!selectedBin) return;

    updateSelectedBin({
      lat: coords.lat,
      lng: coords.lng,
      hasLocation: true,
    });
    setMoveMode(false);
  };

  const handleCoordChange = (field: "lat" | "lng", rawValue: string) => {
    if (!selectedBin) return;

    const parsed = toNumberOrNull(rawValue);
    if (parsed === null) return;

    if (field === "lat") {
      updateSelectedBin({ lat: parsed, hasLocation: true });
      return;
    }

    updateSelectedBin({ lng: parsed, hasLocation: true });
  };

  const handleSelectBin = (id: string) => {
    setSelectedId(id);
    setMoveMode(false);
  };

  const buildSimulatedRoutePayload = (
    typeFilter: MapTypeFilter,
    scheduledStartAt: string
  ): SimulatedRoutePayload | null => {
    const routeEligibleBins = mapBins.filter(
      (bin) => bin.status === "active" && matchesMapTypeFilter(bin, typeFilter)
    );

    const urgentBins = routeEligibleBins
      .filter((bin) => bin.fill >= 50)
      .sort((a, b) => b.fill - a.fill)
      .slice(0, 4);

    const fallbackBins = routeEligibleBins.slice(0, 4);
    const selectedStops = (urgentBins.length >= 2 ? urgentBins : fallbackBins)
      .slice(0, 4)
      .map((bin) => ({ id: bin.id, lat: bin.lat, lng: bin.lng }));

    if (selectedStops.length < 2) return null;

    return {
      routeId: `route-${Date.now()}`,
      provider: "simulated-backend",
      mode: "driving",
      typeFilter,
      scheduledStartAt,
      orderedStops: selectedStops,
    };
  };

  const handleGenerateRoute = async (typeFilter: MapTypeFilter, scheduledStartAt: string) => {
    setRouteLoading(true);
    setRouteError(null);
    setRouteDispatchStatus(null);

    try {
      const simulatedPayload = buildSimulatedRoutePayload(typeFilter, scheduledStartAt);
      if (!simulatedPayload) {
        throw new Error("Not enough mapped active bins for this type filter.");
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
      setLastRouteTypeFilter(simulatedPayload.typeFilter);
      setLastRouteScheduledStartAt(simulatedPayload.scheduledStartAt);
      setRouteDialogOpen(false);
      setRouteDialogError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate route right now.";
      setRouteError(message);
      setRouteDialogError(message);
      setRoutePath([]);
      setRouteStops([]);
      setLastRouteScheduledStartAt(null);
    } finally {
      setRouteLoading(false);
    }
  };

  const openGenerateRouteDialog = () => {
    setRouteDialogTypeFilter("");
    setRouteDialogDate(getCurrentDateInputValue());
    setRouteDialogTime(getCurrentTimeInputValue());
    setRouteDialogError(null);
    setRouteDialogOpen(true);
  };

  const handleConfirmGenerateRoute = async () => {
    if (!routeDialogTypeFilter) {
      setRouteDialogError("Select a bin type.");
      return;
    }

    if (!routeDialogDate || !routeDialogTime) {
      setRouteDialogError("Select a start date and time.");
      return;
    }

    const routeDialogStartAt = `${routeDialogDate}T${routeDialogTime}`;
    const parsedDate = new Date(routeDialogStartAt);
    if (Number.isNaN(parsedDate.getTime())) {
      setRouteDialogError("Invalid start date/time.");
      return;
    }

    setRouteDialogError(null);
    await handleGenerateRoute(routeDialogTypeFilter, routeDialogStartAt);
  };

  const handleCancelRoute = () => {
    setRoutePath([]);
    setRouteStops([]);
    setRouteError(null);
    setLastGeneratedRouteId(null);
    setLastRouteScheduledStartAt(null);
    setRouteDispatchStatus(null);
  };

  const handleSendRouteToCollectionService = async () => {
    if (!lastGeneratedRouteId || routeStops.length === 0) return;

    setRouteDispatching(true);
    setRouteDispatchStatus(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setRouteDispatchStatus(
        `Mission sent to collection service for ${lastGeneratedRouteId}. Team is on the way.`
      );
    } catch {
      setRouteDispatchStatus("Unable to send mission to collection service.");
    } finally {
      setRouteDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SmartNav />
      <main>
        <div className="mx-auto flex max-w-7xl flex-col gap-9 px-6 pb-20 pt-8">
          {(binsError || mutationError) && (
            <div className="space-y-2">
              {binsError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {binsError}
                </div>
              )}
              {mutationError && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {mutationError}
                </div>
              )}
            </div>
          )}

          <section id="overview" className="scroll-mt-28 border-b border-[var(--ops-divider)] pb-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ops-muted)]">
                  Barcelona city operations
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                  SenSight Bin Control Center
                </h1>
                <p className="max-w-2xl text-sm text-slate-600 md:text-base">
                  KPIs, map routing and alerts in one operational workspace.
                </p>
              </div>

              <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:min-w-[24rem]">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--ops-divider)] pb-2 sm:col-span-2">
                  <span className="uppercase tracking-[0.12em] text-[var(--ops-muted)]">Latest sync</span>
                  <span className="font-semibold text-slate-900">{latestReading}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-[0.12em] text-[var(--ops-muted)]">Active bins</span>
                  <span className="font-semibold text-slate-900">{connectedBins}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="uppercase tracking-[0.12em] text-[var(--ops-muted)]">Unverified</span>
                  <span className="font-semibold text-slate-900">{unverifiedBins.length}</span>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full border-[var(--ops-divider-strong)] bg-white px-3 text-xs text-slate-700 hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)]"
                    onClick={() => void loadBins(true)}
                    disabled={binsRefreshing}
                  >
                    {binsRefreshing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Syncing
                      </>
                    ) : (
                      <>
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Refresh data
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <motion.section
            id="stats"
            className="scroll-mt-28 border-b border-[var(--ops-divider)] pb-5"
            initial={sectionReveal.initial}
            animate={sectionReveal.animate}
            transition={{ duration: 0.26, ease: "easeOut", delay: 0.03 }}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[var(--ops-divider)]">
              <div className="space-y-1 lg:pr-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">Total bins</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">{bins.length}</p>
                <p className="text-xs text-slate-500">All indexed bins</p>
              </div>
              <div className="space-y-1 lg:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">Needs pickup</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">{needsCollection}</p>
                <p className="flex items-center gap-1.5 text-xs text-rose-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Fill above 80%
                </p>
              </div>
              <div className="space-y-1 lg:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">Average fill</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">{averageFill}%</p>
                <p className="flex items-center gap-1.5 text-xs text-[var(--ops-accent)]">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Live network trend
                </p>
              </div>
              <div className="space-y-1 lg:pl-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-muted)]">Unverified</p>
                <p className="text-3xl font-semibold tracking-tight text-slate-950">{unverifiedBins.length}</p>
                <p className="text-xs text-amber-700">Pending map configuration</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            id="map"
            className="grid gap-6 scroll-mt-28 lg:grid-cols-[minmax(0,1fr)_22rem]"
            initial={sectionReveal.initial}
            animate={sectionReveal.animate}
            transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
          >
            <div className="space-y-4 border-b border-[var(--ops-divider)] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
              <div className="space-y-3 border-b border-[var(--ops-divider)] pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">Map</h2>
                    <p className="text-sm text-slate-600">Live bin status and collection routing.</p>
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
                          "rounded-full border border-[var(--ops-divider-strong)] bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition",
                          filter === item.key &&
                            "border-[var(--ops-accent)] bg-[color:rgba(0,184,124,0.08)] text-[var(--ops-accent)]"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                    <select
                      value={mapTypeFilter}
                      onChange={(event) => setMapTypeFilter(event.target.value as MapTypeFilter)}
                      className="rounded-full border border-[var(--ops-divider-strong)] bg-white px-3 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[var(--ops-accent)]"
                    >
                      {MAP_TYPE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ml-2 flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() =>
                        setAddMode((previous) => {
                          const next = !previous;
                          if (next) setMoveMode(false);
                          return next;
                        })
                      }
                      size="sm"
                      className={cn(
                        "rounded-full border border-[var(--ops-divider-strong)] bg-white text-slate-700 hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)]",
                        addMode && "border-[var(--ops-accent)] bg-[color:rgba(0,184,124,0.08)] text-[var(--ops-accent)]"
                      )}
                    >
                      <Plus className="h-4 w-4" />
                      {addMode ? "Add mode active" : "Place bin"}
                    </Button>
                    <Button
                      size="sm"
                      variant={hasGeneratedRoute ? "default" : "outline"}
                      className={cn(
                        "rounded-full border-[var(--ops-divider-strong)] bg-white text-slate-700",
                        hasGeneratedRoute
                          ? "border-[var(--ops-accent)] bg-[color:rgba(0,184,124,0.08)] text-[var(--ops-accent)] hover:bg-[color:rgba(0,184,124,0.12)]"
                          : "hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)]"
                      )}
                      onClick={openGenerateRouteDialog}
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
                <div className="rounded-xl border border-[var(--ops-divider)] bg-white px-3 py-2 text-xs text-slate-600">
                  {routeError ? (
                    <span className="text-rose-600">{routeError}</span>
                  ) : routeLoading ? (
                    <span>Simulating backend response and computing road route...</span>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-900">Route {lastGeneratedRouteId ?? ""}</span>
                            <span className="text-slate-400">|</span>
                            <span>Start:</span>
                            <span className="font-semibold text-slate-900">{routeStopsPreview[0] ?? "-"}</span>
                            <span className="text-slate-400">|</span>
                            <span>End:</span>
                            <span className="font-semibold text-slate-900">
                              {routeStopsPreview[routeStopsPreview.length - 1] ?? "-"}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>Order:</span>
                          </div>
                          <div className="font-semibold text-slate-900">{routeStopsPreview.join(" -> ")}</div>
                          {routeStartLabel && (
                            <div className="text-[11px] text-slate-500">
                              Start at: <span className="font-semibold text-slate-900">{routeStartLabel}</span>
                              {" · "}
                              Type: <span className="font-semibold text-slate-900">{routeTypeLabel}</span>
                            </div>
                          )}
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
                            className="rounded-full bg-[var(--ops-accent)] text-white hover:bg-[color:rgba(0,184,124,0.9)]"
                            onClick={handleSendRouteToCollectionService}
                            disabled={routeDispatching}
                          >
                            {routeDispatching ? "Sending..." : "Send to collection service"}
                          </Button>
                        </div>
                      </div>
                      {routeDispatchStatus && (
                        <div className="text-[11px] font-semibold text-emerald-700">{routeDispatchStatus}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <motion.div
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-white transition-colors",
                  selectedId
                    ? "border-[color:rgba(0,184,124,0.5)] ring-2 ring-[color:rgba(0,184,124,0.18)]"
                    : "border-[var(--ops-divider-strong)]"
                )}
                animate={{ y: selectedId ? -2 : 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {addMode && (
                  <div className="absolute left-4 top-4 z-[1000] rounded-full border border-[color:rgba(0,184,124,0.25)] bg-[color:rgba(0,184,124,0.1)] px-3 py-1 text-xs font-semibold text-[var(--ops-accent)]">
                    Click map to place an bin
                  </div>
                )}
                {moveMode && selectedBin && (
                  <div className="absolute left-4 top-14 z-[1000] rounded-full border border-[var(--ops-divider-strong)] bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    Click map to reposition {selectedBin.id}
                  </div>
                )}
                <BinMap
                  bins={mapBins}
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
              </motion.div>

              <div className="flex flex-wrap items-center gap-4 border-t border-[var(--ops-divider)] pt-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--ops-accent)]" />
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
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span>Inactive</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-4 w-4 items-center justify-center">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <polygon points="10,2 18,18 2,18" fill="#facc15" stroke="#ffffff" strokeWidth="1.2" />
                      <text
                        x="10"
                        y="14"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#0f172a"
                      >
                        !
                      </text>
                    </svg>
                  </span>
                  <span>Maintenance</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 lg:border-l lg:border-[var(--ops-divider)] lg:pl-6">
              <div
                id="alerts"
                className="scroll-mt-28"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--ops-divider)] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-slate-950">Alerts</h3>
                      <Bell className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {ALERT_LIST_FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAlertsFilter(option.value)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                            alertsFilter === option.value
                              ? "border-[var(--ops-accent)] bg-[color:rgba(0,184,124,0.08)] text-[var(--ops-accent)]"
                              : "border-[var(--ops-divider-strong)] bg-white text-slate-600"
                          )}
                        >
                          <span>{option.label}</span>
                          <span
                            className={cn(
                              "rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none",
                              alertsFilter === option.value
                                ? "border-[color:rgba(0,184,124,0.25)] bg-[color:rgba(0,184,124,0.12)] text-[var(--ops-accent)]"
                                : "border-[var(--ops-divider-strong)] bg-slate-100 text-slate-700"
                            )}
                          >
                            {alertsCounts[option.value]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full border-[var(--ops-divider-strong)] bg-white px-2.5 text-xs text-slate-700 hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)]"
                  onClick={() => void loadAlerts(alertsFilter, true)}
                  disabled={alertsLoading}
                >
                    {alertsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {alertsError && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-700">
                    {alertsError}
                  </div>
                )}

                <div className="mt-3 max-h-[30rem] space-y-1 overflow-y-auto pr-1">
                  {alertsLoading ? (
                    <div className="rounded-lg border border-[var(--ops-divider)] bg-white px-3 py-5 text-center text-xs text-slate-500">
                      <Loader2 className="mx-auto h-4 w-4 animate-spin text-slate-400" />
                      <div className="mt-2">Loading alerts...</div>
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--ops-divider)] bg-white px-3 py-5 text-center text-xs text-slate-500">
                      {alertsFilter === "open"
                        ? "No open alert for now."
                        : alertsFilter === "seen"
                          ? "No seen alert yet."
                          : "No old alert yet."}
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {alerts.map((alert) => (
                        <motion.div
                          key={alert.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={cn("rounded-lg border-l-2 px-3 py-2 text-sm", getAlertCardToneClass(alert))}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <CircleAlert className="h-4 w-4" />
                                <span className="font-semibold">{alertTypeLabels[alert.type]}</span>
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                    alert.status === "resolved"
                                      ? "border-slate-300 bg-white text-slate-600"
                                      : "border-white/80 bg-white/70 text-current"
                                  )}
                                >
                                  {alertStatusLabels[alert.status]}
                                </span>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {formatAlertTimeAgo(alert.timestamp)} · {alert.bin_id}
                              </div>
                              <p className="mt-2 text-xs text-slate-600">{alert.message}</p>
                            </div>

                            {alert.status === "open" ? (
                              <button
                                type="button"
                                onClick={() => void handleMarkAlertAsSeen(alert.id)}
                                disabled={updatingAlertId === alert.id}
                                className={cn(
                                  alertCheckIconBaseClass,
                                  "border border-slate-300 bg-white text-slate-400 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                              >
                                {updatingAlertId === alert.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 stroke-[2.6]" />
                                )}
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  alertCheckIconBaseClass,
                                  "border border-emerald-300 bg-emerald-100 text-emerald-600"
                                )}
                              >
                                <Check className="h-4 w-4 stroke-[2.8]" />
                              </span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              <motion.div
                key={selectedBin?.id ?? "no-selection"}
                initial={{ opacity: 0.86, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur"
              >
                <h3 className="text-base font-semibold">Selected bin</h3>
                {selectedBin ? (
                  <div className="mt-4 space-y-4 text-sm text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>ID</span>
                      <span className="font-semibold text-slate-900">{selectedBin.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Type</span>
                      <span className="font-semibold text-slate-900">{typeLabels[selectedBin.type]}</span>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Type</label>
                        <select
                          value={selectedBin.type}
                          onChange={(event) => updateSelectedBin({ type: event.target.value as BinType })}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        >
                          {BIN_TYPE_OPTIONS.map((type) => (
                            <option key={type} value={type}>
                              {typeLabels[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Status</label>
                        <select
                          value={selectedBin.status}
                          onChange={(event) =>
                            updateSelectedBin({ status: event.target.value as BinLifecycleStatus })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        >
                          {EDITABLE_BIN_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </div>
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

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Depth (cm)</label>
                        <input
                          type="number"
                          min={1}
                          value={selectedBin.depth}
                          onChange={(event) => {
                            const parsed = toNumberOrNull(event.target.value);
                            if (parsed === null) return;
                            updateSelectedBin({ depth: Math.max(1, Math.round(parsed)) });
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">Battery</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={selectedBin.battery}
                          onChange={(event) => {
                            const parsed = toNumberOrNull(event.target.value);
                            if (parsed === null) return;
                            updateSelectedBin({ battery: clamp(Math.round(parsed), 0, 100) });
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span>Fill level</span>
                        <span className="font-semibold text-slate-900">{selectedBin.fill}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className={cn("h-2 rounded-full", fillBarClass(selectedBin.fill))}
                          style={{ width: `${selectedBin.fill}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedBin.fill}
                        onChange={(event) =>
                          updateSelectedBin({ fill: clamp(Math.round(Number(event.target.value)), 0, 100) })
                        }
                        className="mt-2 w-full"
                      />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2">
                        <span className="text-xs text-slate-500">Coordinates</span>
                        <span className="text-right text-sm font-semibold text-slate-700">
                          {getCoordinatesLabel(selectedBin)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-xs text-slate-500">Lifecycle</span>
                        <Badge className={cn("border", statusBadgeClass(selectedBin.status))}>
                          {statusLabels[selectedBin.status]}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("rounded-full border-slate-200 bg-white", moveMode && "border-slate-900")}
                        onClick={() =>
                          setMoveMode((previous) => {
                            const next = !previous;
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
                        variant="outline"
                        className="rounded-full border-slate-200 bg-white"
                        onClick={() => void handleSaveSelectedBin()}
                        disabled={savingBinId === selectedBin.id}
                      >
                        {savingBinId === selectedBin.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => setDeleteDialogOpen(true)}
                        disabled={savingBinId === selectedBin.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-slate-500">
                    Click a bin on the map or in the table to view details.
                  </div>
                )}
              </motion.div>
            </div>
          </motion.section>

          <section
            id="bins"
            className="scroll-mt-28 flex h-[42rem] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">All bins</h2>
                <p className="text-sm text-slate-500">Operational list for city teams.</p>
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBinsListScopeChange("active")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      binsListScope === "active"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    Active bins
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBinsListScopeChange("unverified")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      binsListScope === "unverified"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    Not initialized bins
                  </button>
                </div>
                <input
                  type="search"
                  placeholder="Search by ID or type"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div key={binsListScope} className="mt-6 min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3">Bin ID</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Coordinates</th>
                    <th className="py-3">Fill level</th>
                    <th className="py-3">Battery</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {binsLoading ? (
                    <tr>
                      <td className="py-8 text-center text-slate-500" colSpan={7}>
                        Loading bins...
                      </td>
                    </tr>
                  ) : binsForTable.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-slate-500" colSpan={7}>
                        No bin found for this filter.
                      </td>
                    </tr>
                  ) : (
                    binsForTable.map((bin) => (
                      <tr
                        key={bin.id}
                        className={cn(
                          "transition hover:bg-slate-50",
                          selectedId === bin.id && "bg-emerald-50/60"
                        )}
                        onClick={() => handleSelectBin(bin.id)}
                      >
                        <td className="py-4 font-semibold text-slate-900">{bin.id}</td>
                        <td className="py-4 text-slate-600">{getTypeCategoryLabel(bin.type)}</td>
                        <td className="py-4 text-slate-600">{getCoordinatesLabel(bin)}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-24 rounded-full bg-slate-100">
                              <div
                                className={cn("h-full rounded-full", fillBarClass(bin.fill))}
                                style={{ width: `${bin.fill}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">{bin.fill}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-slate-600">{bin.battery}%</td>
                        <td className="py-4">
                          <Badge className={cn("border", statusBadgeClass(bin.status))}>
                            {statusLabels[bin.status]}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <Button size="sm" variant="outline" className="rounded-full border-slate-200 bg-white">
                            Select
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Configure an unverified bin</DialogTitle>
            <DialogDescription>
              Pick one unverified backend bin, then place it on the map and patch it to an
              operational status.
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
                    <label className="text-xs text-slate-500">Selected bin</label>
                    <Input
                      value={createSelectedBin?.id ?? "No bin selected"}
                      readOnly
                      className="rounded-xl bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Latitude</label>
                      <Input
                        value={pendingAddCoords ? formatCoords(pendingAddCoords.lat) : "Not selected"}
                        readOnly
                        className="rounded-xl bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-500">Longitude</label>
                      <Input
                        value={pendingAddCoords ? formatCoords(pendingAddCoords.lng) : "Not selected"}
                        readOnly
                        className="rounded-xl bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Type</label>
                  <select
                    value={createType}
                    onChange={(event) => setCreateType(event.target.value as BinType)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  >
                    {BIN_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {typeLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Status after configuration</label>
                  <select
                    value={createStatus}
                    onChange={(event) => setCreateStatus(event.target.value as BinLifecycleStatus)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  >
                    {CONFIGURABLE_BIN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Depth (cm)</label>
                  <Input
                    type="number"
                    min={1}
                    value={createDepth}
                    onChange={(event) => setCreateDepth(event.target.value)}
                    className="rounded-xl border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Unverified bins</div>
                  <div className="text-xs text-slate-500">
                    These bins are detected by backend but not yet placed on the map.
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white"
                  onClick={() => void loadBins(true)}
                  disabled={binsRefreshing}
                >
                  {binsRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  {binsRefreshing ? "Refreshing" : "Refresh"}
                </Button>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {unverifiedBins.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                    No unverified bins available. Initialize bins on-site first.
                  </div>
                ) : (
                  unverifiedBins.map((bin) => {
                    const isSelected = createSelectedBinId === bin.id;

                    return (
                      <button
                        key={bin.id}
                        type="button"
                        onClick={() => {
                          setCreateSelectedBinId(bin.id);
                          setCreateFormError(null);
                        }}
                        className={cn(
                          "w-full rounded-2xl border p-3 text-left transition",
                          isSelected
                            ? "border-slate-400 bg-slate-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-slate-900">{bin.id}</div>
                            <div className="text-[11px] text-slate-500">
                              Type {getTypeCategoryLabel(bin.type)} · Depth {bin.depth}cm
                            </div>
                          </div>
                          <div className="text-xs font-semibold text-slate-500">
                            Fill {bin.fill}% · Battery {bin.battery}%
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                {createSelectedBin ? (
                  <>
                    <div>
                      <span className="font-semibold text-slate-900">Ready to configure:</span>{" "}
                      {createSelectedBin.id}
                    </div>
                    <div className="mt-1">
                      Status will move from <strong>Unverified</strong> to <strong>{statusLabels[createStatus]}</strong>.
                    </div>
                  </>
                ) : (
                  "Select an bin to continue."
                )}
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
              onClick={() => void handleConfirmCreateBin()}
              disabled={!pendingAddCoords || !createSelectedBinId || createSaving}
            >
              {createSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Configuring
                </>
              ) : (
                "Configure bin"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={routeDialogOpen}
        onOpenChange={(open) => {
          setRouteDialogOpen(open);
          if (!open) setRouteDialogError(null);
        }}
      >
        <DialogContent className="max-w-md border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Generate collection route</DialogTitle>
            <DialogDescription className="text-slate-600">
              Choose the bin type and planned collection start date/time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Bin type</label>
              <select
                value={routeDialogTypeFilter}
                onChange={(event) =>
                  setRouteDialogTypeFilter((event.target.value as MapTypeFilter | "") || "")
                }
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition hover:border-slate-400 focus:border-slate-400"
              >
                <option value="" disabled>
                  Select bin type
                </option>
                {ROUTE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Collection date</label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="date"
                  value={routeDialogDate}
                  onChange={(event) => setRouteDialogDate(event.target.value)}
                  className="cursor-pointer rounded-xl border-slate-200 bg-white pl-10 pr-10 text-slate-900 [color-scheme:light] transition hover:border-slate-400"
                />
                <MousePointerClick className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Collection start time</label>
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="time"
                  step={300}
                  value={routeDialogTime}
                  onChange={(event) => setRouteDialogTime(event.target.value)}
                  className="cursor-pointer rounded-xl border-slate-200 bg-white pl-10 pr-10 text-slate-900 [color-scheme:light] transition hover:border-slate-400"
                />
                <MousePointerClick className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            {routeDialogError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {routeDialogError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-full border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
              onClick={() => setRouteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full"
              onClick={() => void handleConfirmGenerateRoute()}
              disabled={routeLoading || !routeDialogTypeFilter}
            >
              {routeLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating
                </>
              ) : (
                "Generate route"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md border border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Delete this bin?</DialogTitle>
            <DialogDescription>
              This will mark {selectedBin?.id ?? "this bin"} as removed in backend.
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
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => void handleDeleteSelected()}
              disabled={!!selectedBin && savingBinId === selectedBin.id}
            >
              Delete bin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

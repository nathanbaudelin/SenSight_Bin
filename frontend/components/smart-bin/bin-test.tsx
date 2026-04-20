"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2, MapPinned, Plus, RefreshCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BIN_TYPE_OPTIONS, isBinMappable, mapBackendBinToBin } from "./bin-data";
import type { BackendBin, BinType } from "./bin-data";
import type { BinMapProps } from "./bin-map";

const BinMap = dynamic<BinMapProps>(() => import("./bin-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] w-full items-center justify-center rounded-3xl border border-white/50 bg-white/70 text-sm text-slate-500 shadow-xl backdrop-blur md:h-[520px]">
      Loading map preview...
    </div>
  ),
});

type ApiResponse<T> = {
  status?: string;
  message?: string;
  data?: T;
};

type PaginatedBins = {
  data: BackendBin[] | BackendBin;
  total: number;
  page: number;
  lastPage: number;
};

type CreatedBinSummary = {
  id: string;
  type: BinType;
  depth: number;
  battery_level: number;
  filling_level: number | null;
  status: "unverified" | "active";
  location: {
    lat: number;
    lng: number;
  } | null;
};

type MappedFillMode = "varied" | "high" | "medium" | "low";

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const toNumberOrNull = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBackendBinsList = (raw: PaginatedBins["data"] | null | undefined): BackendBin[] => {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return [raw];
  return [];
};

const parseApiMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

const BARCELONA_CENTER = {
  lat: 41.3874,
  lng: 2.1686,
};

const MAPPED_ACTIVE_SEEDS = [
  { lat: 41.38967, lng: 2.15941, area: "Sant Antoni" },
  { lat: 41.39711, lng: 2.17145, area: "Gracia" },
  { lat: 41.40341, lng: 2.17403, area: "Sagrada Familia" },
  { lat: 41.38186, lng: 2.16874, area: "Raval" },
  { lat: 41.37534, lng: 2.14388, area: "Sants" },
  { lat: 41.39226, lng: 2.19643, area: "Poblenou" },
  { lat: 41.38363, lng: 2.18129, area: "Born" },
  { lat: 41.40182, lng: 2.15419, area: "Sant Gervasi" },
  { lat: 41.37386, lng: 2.15467, area: "Poble-sec" },
];

const ACTIVE_FILL_PROFILE = [14, 27, 38, 51, 63, 74, 83, 91, 97];
const ACTIVE_TYPE_ROTATION: BinType[] = ["general", "plastic", "paper", "glass", "organic", "metal"];
const mappedFillModeLabels: Record<MappedFillMode, string> = {
  varied: "Random / varied",
  high: "Well filled",
  medium: "Medium",
  low: "Low",
};

const createMappedLocation = (index: number) => {
  const seed = MAPPED_ACTIVE_SEEDS[index % MAPPED_ACTIVE_SEEDS.length];
  const cycle = Math.floor(index / MAPPED_ACTIVE_SEEDS.length);
  const latOffset = ((cycle % 3) - 1) * 0.00058 + (index % 2 === 0 ? 0.00014 : -0.00011);
  const lngOffset = ((cycle % 4) - 1.5) * 0.00042 + (index % 3 === 0 ? 0.00016 : -0.00013);

  return {
    lat: Number((seed.lat + latOffset).toFixed(6)),
    lng: Number((seed.lng + lngOffset).toFixed(6)),
    area: seed.area,
  };
};

const createMappedFillLevel = (index: number, mode: MappedFillMode) => {
  if (mode === "high") {
    const profile = [76, 81, 85, 89, 93, 96];
    return profile[index % profile.length];
  }

  if (mode === "medium") {
    const profile = [42, 48, 53, 57, 61, 66];
    return profile[index % profile.length];
  }

  if (mode === "low") {
    const profile = [9, 14, 19, 24, 28, 33];
    return profile[index % profile.length];
  }

  const base = ACTIVE_FILL_PROFILE[index % ACTIVE_FILL_PROFILE.length];
  const cycle = Math.floor(index / ACTIVE_FILL_PROFILE.length);
  const adjustment = cycle % 2 === 0 ? cycle * 2 : cycle * 3;
  return clamp(base + adjustment, 8, 98);
};

const resolveMappedType = (selectedType: BinType, index: number) =>
  selectedType === "unknown" ? ACTIVE_TYPE_ROTATION[index % ACTIVE_TYPE_ROTATION.length] : selectedType;

export default function BinTest() {
  const [count, setCount] = useState("5");
  const [depth, setDepth] = useState("120");
  const [batteryMin, setBatteryMin] = useState("60");
  const [batteryMax, setBatteryMax] = useState("100");
  const [binType, setBinType] = useState<BinType>("unknown");

  const [mappedCount, setMappedCount] = useState("9");
  const [mappedDepth, setMappedDepth] = useState("120");
  const [mappedBatteryMin, setMappedBatteryMin] = useState("55");
  const [mappedBatteryMax, setMappedBatteryMax] = useState("96");
  const [mappedBinType, setMappedBinType] = useState<BinType>("unknown");
  const [mappedFillMode, setMappedFillMode] = useState<MappedFillMode>("varied");

  const [creating, setCreating] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [creatingMapped, setCreatingMapped] = useState(false);
  const [mappedProgressDone, setMappedProgressDone] = useState(0);
  const [mappedProgressTotal, setMappedProgressTotal] = useState(0);
  const [mappedCreateError, setMappedCreateError] = useState<string | null>(null);
  const [mappedCreateSuccess, setMappedCreateSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [deletingActive, setDeletingActive] = useState(false);
  const [deletingUnverified, setDeletingUnverified] = useState(false);

  const [createdBins, setCreatedBins] = useState<CreatedBinSummary[]>([]);

  const [unverifiedBins, setUnverifiedBins] = useState<BackendBin[]>([]);
  const [unverifiedLoading, setUnverifiedLoading] = useState(true);
  const [unverifiedRefreshing, setUnverifiedRefreshing] = useState(false);
  const [unverifiedError, setUnverifiedError] = useState<string | null>(null);

  const [activeBins, setActiveBins] = useState<BackendBin[]>([]);
  const [activeBinsLoading, setActiveBinsLoading] = useState(true);
  const [activeBinsRefreshing, setActiveBinsRefreshing] = useState(false);
  const [activeBinsError, setActiveBinsError] = useState<string | null>(null);

  const progressPercent = useMemo(() => {
    if (progressTotal === 0) return 0;
    return Math.round((progressDone / progressTotal) * 100);
  }, [progressDone, progressTotal]);

  const mappedProgressPercent = useMemo(() => {
    if (mappedProgressTotal === 0) return 0;
    return Math.round((mappedProgressDone / mappedProgressTotal) * 100);
  }, [mappedProgressDone, mappedProgressTotal]);

  const activeMapBins = useMemo(
    () => activeBins.map(mapBackendBinToBin).filter(isBinMappable),
    [activeBins]
  );

  const localSessionSummary = useMemo(
    () => ({
      total: createdBins.length,
      active: createdBins.filter((bin) => bin.status === "active").length,
      unverified: createdBins.filter((bin) => bin.status === "unverified").length,
    }),
    [createdBins]
  );

  const fetchUnverifiedBins = useCallback(async (silent = false) => {
    if (silent) {
      setUnverifiedRefreshing(true);
    } else {
      setUnverifiedLoading(true);
    }
    setUnverifiedError(null);

    try {
      const response = await fetch("/api/bins?status=unverified&limit=100", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApiResponse<PaginatedBins> | null;

      if (!response.ok) {
        throw new Error(parseApiMessage(payload, "Unable to load unverified bins."));
      }

      setUnverifiedBins(toBackendBinsList(payload?.data?.data));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load unverified bins.";
      setUnverifiedError(message);
    } finally {
      if (silent) {
        setUnverifiedRefreshing(false);
      } else {
        setUnverifiedLoading(false);
      }
    }
  }, []);

  const fetchActiveBins = useCallback(async (silent = false) => {
    if (silent) {
      setActiveBinsRefreshing(true);
    } else {
      setActiveBinsLoading(true);
    }
    setActiveBinsError(null);

    try {
      const response = await fetch("/api/bins?status=active&limit=100", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApiResponse<PaginatedBins> | null;

      if (!response.ok) {
        throw new Error(parseApiMessage(payload, "Unable to load active bins."));
      }

      setActiveBins(toBackendBinsList(payload?.data?.data));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load active bins.";
      setActiveBinsError(message);
    } finally {
      if (silent) {
        setActiveBinsRefreshing(false);
      } else {
        setActiveBinsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchUnverifiedBins();
    void fetchActiveBins();
  }, [fetchActiveBins, fetchUnverifiedBins]);

  const handleGenerateUnverifiedBins = async () => {
    setCreateError(null);
    setCreateSuccess(null);

    const parsedCount = toNumberOrNull(count);
    const parsedDepth = toNumberOrNull(depth);
    const parsedBatteryMin = toNumberOrNull(batteryMin);
    const parsedBatteryMax = toNumberOrNull(batteryMax);

    if (parsedCount === null || parsedCount < 1 || parsedCount > 200) {
      setCreateError("Count must be between 1 and 200.");
      return;
    }

    if (parsedDepth === null || parsedDepth <= 0) {
      setCreateError("Depth must be greater than 0.");
      return;
    }

    if (
      parsedBatteryMin === null ||
      parsedBatteryMax === null ||
      parsedBatteryMin < 1 ||
      parsedBatteryMax > 100 ||
      parsedBatteryMin > parsedBatteryMax
    ) {
      setCreateError("Battery range must be between 1 and 100, with min <= max.");
      return;
    }

    const total = Math.floor(parsedCount);
    const depthValue = Math.round(parsedDepth);
    const minValue = Math.round(parsedBatteryMin);
    const maxValue = Math.round(parsedBatteryMax);

    setCreating(true);
    setProgressDone(0);
    setProgressTotal(total);

    const newlyCreated: CreatedBinSummary[] = [];

    try {
      for (let index = 0; index < total; index += 1) {
        const batteryValue = clamp(randomInt(minValue, maxValue), 1, 100);

        const response = await fetch("/api/bins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: binType,
            depth: depthValue,
            battery_level: batteryValue,
            status: "unverified",
          }),
        });

        const payload = (await response.json().catch(() => null)) as ApiResponse<BackendBin> | null;

        if (!response.ok) {
          throw new Error(parseApiMessage(payload, `Creation failed at item ${index + 1}.`));
        }

        const createdBin = payload?.data;
        if (!createdBin?.id) {
          throw new Error(`Invalid backend response at item ${index + 1}.`);
        }

        newlyCreated.push({
          id: createdBin.id,
          type: createdBin.type ?? binType,
          depth: createdBin.depth,
          battery_level: createdBin.battery_level,
          filling_level: null,
          status: "unverified",
          location: null,
        });

        setProgressDone(index + 1);
      }

      setCreatedBins((previous) => [...newlyCreated, ...previous].slice(0, 160));
      setCreateSuccess(`${newlyCreated.length} unverified bin(s) created successfully.`);
      await fetchUnverifiedBins(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create unverified bins.";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleGenerateMappedBins = async () => {
    setMappedCreateError(null);
    setMappedCreateSuccess(null);

    const parsedCount = toNumberOrNull(mappedCount);
    const parsedDepth = toNumberOrNull(mappedDepth);
    const parsedBatteryMin = toNumberOrNull(mappedBatteryMin);
    const parsedBatteryMax = toNumberOrNull(mappedBatteryMax);

    if (parsedCount === null || parsedCount < 1 || parsedCount > 120) {
      setMappedCreateError("Count must be between 1 and 120.");
      return;
    }

    if (parsedDepth === null || parsedDepth <= 0) {
      setMappedCreateError("Depth must be greater than 0.");
      return;
    }

    if (
      parsedBatteryMin === null ||
      parsedBatteryMax === null ||
      parsedBatteryMin < 1 ||
      parsedBatteryMax > 100 ||
      parsedBatteryMin > parsedBatteryMax
    ) {
      setMappedCreateError("Battery range must be between 1 and 100, with min <= max.");
      return;
    }

    const total = Math.floor(parsedCount);
    const depthValue = Math.round(parsedDepth);
    const minValue = Math.round(parsedBatteryMin);
    const maxValue = Math.round(parsedBatteryMax);

    setCreatingMapped(true);
    setMappedProgressDone(0);
    setMappedProgressTotal(total);

    const newlyCreated: CreatedBinSummary[] = [];

    try {
      for (let index = 0; index < total; index += 1) {
        const batteryValue = clamp(randomInt(minValue, maxValue), 1, 100);
        const location = createMappedLocation(index);
        const fillLevel = createMappedFillLevel(index, mappedFillMode);
        const resolvedType = resolveMappedType(mappedBinType, index);

        const createResponse = await fetch("/api/bins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: resolvedType,
            depth: depthValue,
            battery_level: batteryValue,
            status: "active",
            location: {
              lat: location.lat,
              lng: location.lng,
            },
          }),
        });

        const createPayload = (await createResponse.json().catch(() => null)) as ApiResponse<BackendBin> | null;

        if (!createResponse.ok) {
          throw new Error(parseApiMessage(createPayload, `Creation failed at item ${index + 1}.`));
        }

        const createdBin = createPayload?.data;
        if (!createdBin?.id) {
          throw new Error(`Invalid backend response at item ${index + 1}.`);
        }

        const patchResponse = await fetch(`/api/bins/${createdBin.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filling_level: fillLevel,
          }),
        });

        const patchPayload = (await patchResponse.json().catch(() => null)) as ApiResponse<BackendBin> | null;

        if (!patchResponse.ok) {
          throw new Error(parseApiMessage(patchPayload, `Fill update failed at item ${index + 1}.`));
        }

        const updatedBin = patchPayload?.data;

        newlyCreated.push({
          id: createdBin.id,
          type: updatedBin?.type ?? createdBin.type ?? resolvedType,
          depth: updatedBin?.depth ?? createdBin.depth,
          battery_level: updatedBin?.battery_level ?? createdBin.battery_level,
          filling_level: updatedBin?.filling_level ?? fillLevel,
          status: "active",
          location: {
            lat: location.lat,
            lng: location.lng,
          },
        });

        setMappedProgressDone(index + 1);
      }

      setCreatedBins((previous) => [...newlyCreated, ...previous].slice(0, 160));
      setMappedCreateSuccess(
        `${newlyCreated.length} mapped active bin(s) created in Barcelona with varied fill levels.`
      );
      await fetchActiveBins(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create mapped active bins.";
      setMappedCreateError(message);
    } finally {
      setCreatingMapped(false);
    }
  };

  const deleteBins = useCallback(async (bins: BackendBin[], fallbackLabel: string) => {
    for (const bin of bins) {
      const response = await fetch(`/api/bins/${bin.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse<BackendBin> | null;

      if (!response.ok) {
        throw new Error(parseApiMessage(payload, `Unable to delete ${fallbackLabel} bin ${bin.id}.`));
      }
    }
  }, []);

  const handleDeleteActiveBins = async () => {
    setDeleteError(null);
    setDeleteSuccess(null);

    if (activeBins.length === 0) {
      setDeleteSuccess("No active bins to delete.");
      return;
    }

    setDeletingActive(true);

    try {
      await deleteBins(activeBins, "active");
      setCreatedBins((previous) => previous.filter((bin) => bin.status !== "active"));
      setDeleteSuccess(`${activeBins.length} active bin(s) deleted successfully.`);
      await fetchActiveBins(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete active bins.";
      setDeleteError(message);
    } finally {
      setDeletingActive(false);
    }
  };

  const handleDeleteUnverifiedBins = async () => {
    setDeleteError(null);
    setDeleteSuccess(null);

    if (unverifiedBins.length === 0) {
      setDeleteSuccess("No unverified bins to delete.");
      return;
    }

    setDeletingUnverified(true);

    try {
      await deleteBins(unverifiedBins, "unverified");
      setCreatedBins((previous) => previous.filter((bin) => bin.status !== "unverified"));
      setDeleteSuccess(`${unverifiedBins.length} unverified bin(s) deleted successfully.`);
      await fetchUnverifiedBins(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete unverified bins.";
      setDeleteError(message);
    } finally {
      setDeletingUnverified(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold">Developer Bin Test Panel</div>
            <div className="text-xs text-slate-500">
              Generate backend bins to test both onboarding flow and already-configured map behavior.
            </div>
          </div>
          <Button size="sm" variant="outline" className="rounded-full border-slate-200 bg-white" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 pb-16 pt-10">
        {(createError ||
          mappedCreateError ||
          unverifiedError ||
          activeBinsError ||
          deleteError ||
          createSuccess ||
          mappedCreateSuccess ||
          deleteSuccess) && (
          <div className="space-y-2">
            {createError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {createError}
              </div>
            )}
            {mappedCreateError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {mappedCreateError}
              </div>
            )}
            {unverifiedError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {unverifiedError}
              </div>
            )}
            {activeBinsError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {activeBinsError}
              </div>
            )}
            {deleteError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {deleteError}
              </div>
            )}
            {createSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {createSuccess}
              </div>
            )}
            {mappedCreateSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {mappedCreateSuccess}
              </div>
            )}
            {deleteSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {deleteSuccess}
              </div>
            )}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">Batch generator</div>
                <div className="text-2xl font-semibold">Create unverified bins</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white"
                onClick={() => void fetchUnverifiedBins(true)}
                disabled={unverifiedRefreshing || creating || creatingMapped}
              >
                {unverifiedRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Refresh list
                  </>
                )}
              </Button>
            </div>

            <div className="mt-2 max-w-xl text-sm text-slate-500">
              Use this flow to simulate freshly detected bins that still need manual placement from the dashboard.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Count</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Type</label>
                <select
                  value={binType}
                  onChange={(event) => setBinType(event.target.value as BinType)}
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
                <label className="text-xs font-semibold text-slate-600">Depth (cm)</label>
                <input
                  type="number"
                  min={1}
                  value={depth}
                  onChange={(event) => setDepth(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Battery min</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batteryMin}
                    onChange={(event) => setBatteryMin(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Battery max</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={batteryMax}
                    onChange={(event) => setBatteryMax(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Button
                onClick={() => void handleGenerateUnverifiedBins()}
                className="rounded-full"
                disabled={creating || creatingMapped}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating {progressDone}/{progressTotal}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate unverified bins
                  </>
                )}
              </Button>

              {(creating || progressTotal > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-900">
                      {progressDone}/{progressTotal} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">Mapped generator</div>
                <div className="text-2xl font-semibold">Create active bins on the map</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white"
                onClick={() => void fetchActiveBins(true)}
                disabled={activeBinsRefreshing || creating || creatingMapped || deletingActive || deletingUnverified}
              >
                {activeBinsRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing
                  </>
                ) : (
                  <>
                    <RefreshCcw className="h-4 w-4" />
                    Refresh list
                  </>
                )}
              </Button>
            </div>

            <div className="mt-2 max-w-xl text-sm text-slate-500">
              These bins are created directly as <span className="font-semibold text-slate-900">active</span>, assigned to
              Barcelona coordinates, then patched with varied fill levels so they appear immediately on the operational map.
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Count</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={mappedCount}
                  onChange={(event) => setMappedCount(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Type</label>
                <select
                  value={mappedBinType}
                  onChange={(event) => setMappedBinType(event.target.value as BinType)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {BIN_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type === "unknown" ? "Mixed rotation" : typeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Depth (cm)</label>
                <input
                  type="number"
                  min={1}
                  value={mappedDepth}
                  onChange={(event) => setMappedDepth(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">Fill profile</label>
                <select
                  value={mappedFillMode}
                  onChange={(event) => setMappedFillMode(event.target.value as MappedFillMode)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                >
                  {Object.entries(mappedFillModeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Battery min</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={mappedBatteryMin}
                    onChange={(event) => setMappedBatteryMin(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Battery max</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={mappedBatteryMax}
                    onChange={(event) => setMappedBatteryMax(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <Button
                onClick={() => void handleGenerateMappedBins()}
                className="rounded-full"
                disabled={creating || creatingMapped}
              >
                {creatingMapped ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating {mappedProgressDone}/{mappedProgressTotal}
                  </>
                ) : (
                  <>
                    <MapPinned className="h-4 w-4" />
                    Generate mapped active bins
                  </>
                )}
              </Button>

              {(creatingMapped || mappedProgressTotal > 0) && (
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-900">
                      {mappedProgressDone}/{mappedProgressTotal} ({mappedProgressPercent}%)
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${mappedProgressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.55fr_1.45fr]">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-500">Session overview</div>
            <div className="mt-2 text-3xl font-semibold">{localSessionSummary.total}</div>
            <div className="text-xs text-slate-500">bins created from this panel in the current browser session</div>

            <div className="mt-6 grid gap-2 text-xs text-slate-500">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div>Active bins in backend</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {activeBinsLoading ? "..." : activeBins.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div>Unverified bins in backend</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {unverifiedLoading ? "..." : unverifiedBins.length}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div>Configured this session</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{localSessionSummary.active}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div>Pending placement this session</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{localSessionSummary.unverified}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Mapped active bins preview</h2>
                <p className="text-sm text-slate-500">
                  Freshly created active bins show up here immediately, with different fill levels and realistic Barcelona
                  positions.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white"
                onClick={() => void fetchActiveBins(true)}
                disabled={activeBinsRefreshing || creating || creatingMapped || deletingActive || deletingUnverified}
              >
                {activeBinsRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {activeBinsRefreshing ? "Refreshing" : "Refresh map"}
              </Button>
            </div>

            <div className="mt-5">
              {activeBinsLoading ? (
                <div className="flex h-[380px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 md:h-[520px]">
                  Loading active bins map...
                </div>
              ) : activeMapBins.length === 0 ? (
                <div className="flex h-[380px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-500 md:h-[520px]">
                  No active mapped bins yet. Generate a batch to see them on the map.
                </div>
              ) : (
                <BinMap
                  bins={activeMapBins}
                  center={BARCELONA_CENTER}
                  addMode={false}
                  moveMode={false}
                  selectedId={null}
                  onAdd={() => undefined}
                  onMove={() => undefined}
                  onSelect={() => undefined}
                />
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recently created (local session)</h2>
              <p className="text-sm text-slate-500">Latest generated bins from this panel, including already-mapped active test bins.</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">Bin ID</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Depth</th>
                  <th className="py-3">Fill</th>
                  <th className="py-3">Battery</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {createdBins.length === 0 ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={7}>
                      No bins generated yet in this session.
                    </td>
                  </tr>
                ) : (
                  createdBins.slice(0, 60).map((bin) => (
                    <tr key={bin.id}>
                      <td className="py-3 font-semibold text-slate-900">{bin.id}</td>
                      <td className="py-3 text-slate-600">{typeLabels[bin.type]}</td>
                      <td className="py-3 text-slate-600">{bin.depth} cm</td>
                      <td className="py-3 text-slate-600">
                        {typeof bin.filling_level === "number" ? `${bin.filling_level}%` : "pending"}
                      </td>
                      <td className="py-3 text-slate-600">{bin.battery_level}%</td>
                      <td className="py-3">
                        <span
                          className={
                            bin.status === "active"
                              ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700"
                          }
                        >
                          {bin.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">
                        {bin.location ? `${bin.location.lat.toFixed(4)}, ${bin.location.lng.toFixed(4)}` : "not mapped"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Current active bins from backend</h2>
                <p className="text-sm text-slate-500">Use this list to verify mapped test data and the fill levels currently visible on the operational map.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white"
                onClick={() => void fetchActiveBins(true)}
                disabled={activeBinsRefreshing || creating || creatingMapped || deletingActive || deletingUnverified}
              >
                {activeBinsRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {activeBinsRefreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                onClick={() => void handleDeleteActiveBins()}
                disabled={activeBinsRefreshing || creating || creatingMapped || deletingActive || deletingUnverified}
              >
                {deletingActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingActive ? "Deleting" : "Delete all active"}
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3">Bin ID</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Location</th>
                    <th className="py-3">Fill</th>
                    <th className="py-3">Battery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeBinsLoading ? (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={5}>
                        Loading active bins...
                      </td>
                    </tr>
                  ) : activeBins.length === 0 ? (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={5}>
                        No active bins in backend.
                      </td>
                    </tr>
                  ) : (
                    activeBins.map((bin) => (
                      <tr key={bin.id}>
                        <td className="py-3 font-semibold text-slate-900">{bin.id}</td>
                        <td className="py-3 text-slate-600">{typeLabels[bin.type ?? "unknown"]}</td>
                        <td className="py-3 text-slate-600">
                          {typeof bin.location?.lat === "number" && typeof bin.location?.lng === "number"
                            ? `${bin.location.lat.toFixed(4)}, ${bin.location.lng.toFixed(4)}`
                            : "missing"}
                        </td>
                        <td className="py-3 text-slate-600">{bin.filling_level}%</td>
                        <td className="py-3 text-slate-600">{bin.battery_level}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Current unverified bins from backend</h2>
                <p className="text-sm text-slate-500">Use this list to verify test data before mapping bins manually in the dashboard.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 bg-white"
                onClick={() => void fetchUnverifiedBins(true)}
                disabled={unverifiedRefreshing || creating || creatingMapped || deletingActive || deletingUnverified}
              >
                {unverifiedRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                {unverifiedRefreshing ? "Refreshing" : "Refresh"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                onClick={() => void handleDeleteUnverifiedBins()}
                disabled={unverifiedRefreshing || creating || creatingMapped || deletingActive || deletingUnverified}
              >
                {deletingUnverified ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deletingUnverified ? "Deleting" : "Delete all unverified"}
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3">Bin ID</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Depth</th>
                    <th className="py-3">Fill</th>
                    <th className="py-3">Battery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unverifiedLoading ? (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={5}>
                        Loading unverified bins...
                      </td>
                    </tr>
                  ) : unverifiedBins.length === 0 ? (
                    <tr>
                      <td className="py-6 text-slate-500" colSpan={5}>
                        No unverified bins in backend.
                      </td>
                    </tr>
                  ) : (
                    unverifiedBins.map((bin) => (
                      <tr key={bin.id}>
                        <td className="py-3 font-semibold text-slate-900">{bin.id}</td>
                        <td className="py-3 text-slate-600">{typeLabels[bin.type ?? "unknown"]}</td>
                        <td className="py-3 text-slate-600">{bin.depth} cm</td>
                        <td className="py-3 text-slate-600">{bin.filling_level}%</td>
                        <td className="py-3 text-slate-600">{bin.battery_level}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

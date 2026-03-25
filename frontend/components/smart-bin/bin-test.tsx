"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, Loader2, Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BIN_TYPE_OPTIONS } from "./bin-data";
import type { BackendBin, BinType } from "./bin-data";

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
};

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

export default function BinTest() {
  const [count, setCount] = useState("5");
  const [depth, setDepth] = useState("120");
  const [batteryMin, setBatteryMin] = useState("60");
  const [batteryMax, setBatteryMax] = useState("100");
  const [binType, setBinType] = useState<BinType>("unknown");

  const [creating, setCreating] = useState(false);
  const [progressDone, setProgressDone] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createdBins, setCreatedBins] = useState<CreatedBinSummary[]>([]);

  const [unverifiedBins, setUnverifiedBins] = useState<BackendBin[]>([]);
  const [unverifiedLoading, setUnverifiedLoading] = useState(true);
  const [unverifiedRefreshing, setUnverifiedRefreshing] = useState(false);
  const [unverifiedError, setUnverifiedError] = useState<string | null>(null);

  const progressPercent = useMemo(() => {
    if (progressTotal === 0) return 0;
    return Math.round((progressDone / progressTotal) * 100);
  }, [progressDone, progressTotal]);

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

      const bins = toBackendBinsList(payload?.data?.data);
      setUnverifiedBins(bins);
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

  useEffect(() => {
    void fetchUnverifiedBins();
  }, [fetchUnverifiedBins]);

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
        });

        setProgressDone(index + 1);
      }

      setCreatedBins((previous) => [...newlyCreated, ...previous].slice(0, 120));
      setCreateSuccess(`${newlyCreated.length} unverified bin(s) created successfully.`);
      await fetchUnverifiedBins(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create unverified bins.";
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold">Developer Bin Test Panel</div>
            <div className="text-xs text-slate-500">
              Generate backend unverified bins in batch to test the dashboard configuration flow.
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

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-16 pt-10">
        {(createError || unverifiedError || createSuccess) && (
          <div className="space-y-2">
            {createError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {createError}
              </div>
            )}
            {unverifiedError && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <CircleAlert className="h-4 w-4" />
                {unverifiedError}
              </div>
            )}
            {createSuccess && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {createSuccess}
              </div>
            )}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
                disabled={unverifiedRefreshing || creating}
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
                disabled={creating}
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
                    <span className="font-semibold text-slate-900">{progressDone}/{progressTotal} ({progressPercent}%)</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="text-sm text-slate-500">Backend snapshot</div>
            <div className="mt-2 text-3xl font-semibold">{unverifiedBins.length}</div>
            <div className="text-xs text-slate-500">unverified bins currently in backend (limited to 200)</div>

            <div className="mt-6 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div>Last batch</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{createdBins.length}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div>Status target</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">unverified</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Recently created (local session)</h2>
              <p className="text-sm text-slate-500">Latest generated bins from this panel.</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">Bin ID</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Depth</th>
                  <th className="py-3">Battery</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {createdBins.length === 0 ? (
                  <tr>
                    <td className="py-6 text-slate-500" colSpan={5}>
                      No bins generated yet in this session.
                    </td>
                  </tr>
                ) : (
                  createdBins.slice(0, 40).map((bin) => (
                    <tr key={bin.id}>
                      <td className="py-3 font-semibold text-slate-900">{bin.id}</td>
                      <td className="py-3 text-slate-600">{typeLabels[bin.type]}</td>
                      <td className="py-3 text-slate-600">{bin.depth} cm</td>
                      <td className="py-3 text-slate-600">{bin.battery_level}%</td>
                      <td className="py-3">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">
                          unverified
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Current unverified bins from backend</h2>
              <p className="text-sm text-slate-500">Use this list to verify test data before mapping bins in dashboard.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-slate-200 bg-white"
              onClick={() => void fetchUnverifiedBins(true)}
              disabled={unverifiedRefreshing || creating}
            >
              {unverifiedRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              {unverifiedRefreshing ? "Refreshing" : "Refresh"}
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
        </section>
      </main>
    </div>
  );
}

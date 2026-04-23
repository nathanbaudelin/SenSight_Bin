"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import type { Bin } from "./bin-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type PredictionPayload = {
  bin_id: string;
  prediction_unit?: string;
  forecast_days?: number;
  data: number[];
};

type PredictionForecastModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bin: Bin | null;
  prediction: PredictionPayload | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

type ForecastPoint = {
  dayOffset: number;
  value: number;
  label: string;
  dateLabel: string;
};

type ForecastTone = "safe" | "soon" | "critical";

const FORECAST_RANGE_OPTIONS = [3, 6, 9] as const;

const BIN_TYPE_LABELS: Record<Bin["type"], string> = {
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

const normalizePredictionValue = (value: number, unit?: string) => {
  if (!Number.isFinite(value)) return null;
  if (unit === "percentage_0_to_1") {
    return clamp(Math.round(value * 100), 0, 100);
  }
  return clamp(Math.round(value), 0, 100);
};

const formatForecastDate = (dayOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
};

const buildForecastPoints = (prediction: PredictionPayload | null): ForecastPoint[] => {
  if (!prediction) return [];

  return prediction.data
    .map((rawValue, index) => {
      const normalizedValue = normalizePredictionValue(rawValue, prediction.prediction_unit);
      if (normalizedValue === null) return null;

      const dayOffset = index + 1;
      return {
        dayOffset,
        value: normalizedValue,
        label: `J+${dayOffset}`,
        dateLabel: formatForecastDate(dayOffset),
      };
    })
    .filter((point): point is ForecastPoint => point !== null);
};

const getForecastValueAtDay = (points: ForecastPoint[], dayOffset: number) =>
  points.find((point) => point.dayOffset === dayOffset)?.value ?? null;

const getOverflowPoint = (points: ForecastPoint[], currentFill: number) => {
  if (currentFill >= 80) {
    return {
      dayOffset: 0,
      value: currentFill,
      label: "Now",
      dateLabel: "Already above 80%",
    };
  }

  return points.find((point) => point.value >= 80) ?? null;
};

const getForecastTone = (
  points: ForecastPoint[],
  currentFill: number,
  overflowPoint: ReturnType<typeof getOverflowPoint>
): ForecastTone => {
  if (currentFill >= 80) return "critical";
  if (overflowPoint && overflowPoint.dayOffset <= 3) return "critical";
  if (overflowPoint && overflowPoint.dayOffset <= 7) return "soon";
  if (points[points.length - 1]?.value >= 70) return "soon";
  return "safe";
};

const FORECAST_TONE_STYLES: Record<
  ForecastTone,
  {
    label: string;
    description: string;
    badgeClassName: string;
    icon: typeof ShieldCheck;
    iconClassName: string;
  }
> = {
  safe: {
    label: "Safe",
    description: "No overflow predicted in the visible horizon.",
    badgeClassName: "border-emerald-300 bg-emerald-500/15 text-emerald-100",
    icon: ShieldCheck,
    iconClassName: "text-emerald-300",
  },
  soon: {
    label: "Soon full",
    description: "This bin should be watched in the next few days.",
    badgeClassName: "border-amber-300 bg-amber-400/15 text-amber-50",
    icon: TrendingUp,
    iconClassName: "text-amber-200",
  },
  critical: {
    label: "Critical soon",
    description: "Pickup should be scheduled quickly.",
    badgeClassName: "border-rose-300 bg-rose-400/15 text-rose-50",
    icon: ShieldAlert,
    iconClassName: "text-rose-200",
  },
};

function ForecastSparkline({ points }: { points: ForecastPoint[] }) {
  const gradientId = useId();

  const chartGeometry = useMemo(() => {
    const width = 860;
    const height = 360;
    const padding = { top: 20, right: 72, bottom: 74, left: 20 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const toY = (value: number) => padding.top + plotHeight - (value / 100) * plotHeight;
    const levelLines = [100, 75, 50, 25, 0].map((value) => ({
      value,
      y: toY(value),
    }));

    if (!points.length) {
      return {
        width,
        height,
        padding,
        areaPath: "",
        linePath: "",
        levelLines,
        thresholdY: toY(80),
        axisLabels: [] as Array<ForecastPoint & { x: number; y: number }>,
        points: [] as Array<ForecastPoint & { x: number; y: number }>,
      };
    }

    const xStep = points.length === 1 ? 0 : plotWidth / (points.length - 1);
    const positionedPoints = points.map((point, index) => {
      const x = padding.left + (points.length === 1 ? plotWidth / 2 : index * xStep);
      const y = padding.top + plotHeight - (point.value / 100) * plotHeight;
      return { ...point, x, y };
    });

    const linePath = positionedPoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const lastPoint = positionedPoints[positionedPoints.length - 1];
    const firstPoint = positionedPoints[0];
    const areaPath = `${linePath} L ${lastPoint.x} ${padding.top + plotHeight} L ${firstPoint.x} ${
      padding.top + plotHeight
    } Z`;
    const axisLabelIndexes = Array.from(
      new Set([0, Math.min(2, points.length - 1), Math.min(6, points.length - 1), points.length - 1])
    );

    return {
      width,
      height,
      padding,
      areaPath,
      linePath,
      levelLines,
      thresholdY: toY(80),
      axisLabels: axisLabelIndexes.map((index) => positionedPoints[index]),
      points: positionedPoints,
    };
  }, [points]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950/95 p-5 shadow-[0_22px_80px_rgba(15,23,42,0.28)]">
      <svg
        viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
        className="h-[320px] w-full md:h-[360px]"
        role="img"
        aria-label="Forecast chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>

        {chartGeometry.levelLines.map((level) => (
          <g key={level.value}>
            <line
              x1={chartGeometry.padding.left}
              x2={chartGeometry.width - chartGeometry.padding.right}
              y1={level.y}
              y2={level.y}
              stroke={level.value === 0 ? "rgba(148,163,184,0.32)" : "rgba(148,163,184,0.22)"}
              strokeDasharray={level.value === 0 ? undefined : "5 8"}
            />
            <text
              x={chartGeometry.width - 8}
              y={level.y + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="600"
            >
              {level.value}%
            </text>
          </g>
        ))}

        <line
          x1={chartGeometry.padding.left}
          x2={chartGeometry.width - chartGeometry.padding.right}
          y1={chartGeometry.thresholdY}
          y2={chartGeometry.thresholdY}
          stroke="#f59e0b"
          strokeDasharray="10 8"
          strokeWidth="2"
        />
        <text x="24" y={chartGeometry.thresholdY - 8} fill="#fbbf24" fontSize="12" fontWeight="700">
          80% threshold
        </text>

        {chartGeometry.areaPath ? (
          <path d={chartGeometry.areaPath} fill={`url(#${gradientId})`} />
        ) : null}
        {chartGeometry.linePath ? (
          <path
            d={chartGeometry.linePath}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {chartGeometry.points.map((point) => (
          <g key={point.dayOffset}>
            <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" />
            <circle cx={point.x} cy={point.y} r="3" fill="#34d399" />
          </g>
        ))}

        {chartGeometry.axisLabels.map((point) => (
          <g key={`axis-${point.dayOffset}`}>
            <text
              x={point.x}
              y={chartGeometry.height - 24}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="700"
              letterSpacing="0.12em"
            >
              {point.label}
            </text>
            <text
              x={point.x}
              y={chartGeometry.height - 8}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="11"
              fontWeight="500"
            >
              {point.dateLabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function PredictionForecastModal({
  open,
  onOpenChange,
  bin,
  prediction,
  loading,
  error,
  onRetry,
}: PredictionForecastModalProps) {
  const allForecastPoints = useMemo(() => buildForecastPoints(prediction), [prediction]);
  const [selectedRangeDays, setSelectedRangeDays] = useState<number>(9);

  useEffect(() => {
    const availableMaxDays = allForecastPoints.length || 9;
    const preferredRange = [...FORECAST_RANGE_OPTIONS]
      .reverse()
      .find((option) => option <= availableMaxDays);

    setSelectedRangeDays(preferredRange ?? Math.min(availableMaxDays, 3));
  }, [allForecastPoints.length, prediction?.bin_id]);

  const forecastPoints = useMemo(
    () => allForecastPoints.slice(0, selectedRangeDays),
    [allForecastPoints, selectedRangeDays]
  );
  const overflowPoint = useMemo(
    () => getOverflowPoint(forecastPoints, bin?.fill ?? 0),
    [bin?.fill, forecastPoints]
  );
  const forecastTone = useMemo(
    () => getForecastTone(forecastPoints, bin?.fill ?? 0, overflowPoint),
    [bin?.fill, forecastPoints, overflowPoint]
  );
  const tone = FORECAST_TONE_STYLES[forecastTone];
  const ToneIcon = tone.icon;
  const j1 = getForecastValueAtDay(forecastPoints, 1);
  const j3 = getForecastValueAtDay(forecastPoints, 3);
  const j7 = getForecastValueAtDay(forecastPoints, 7);
  const forecastHorizonDays = prediction?.forecast_days ?? allForecastPoints.length;
  const availableRangeOptions = FORECAST_RANGE_OPTIONS.filter(
    (option) => option <= allForecastPoints.length
  );

  const metricRows = [
    { label: "Current fill", value: bin ? `${bin.fill}%` : "--" },
    { label: "J+1", value: j1 === null ? "--" : `${j1}%` },
    { label: "J+3", value: j3 === null ? "--" : `${j3}%` },
    { label: "J+7", value: j7 === null ? "--" : `${j7}%` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto border border-slate-200 bg-[#f7f4ef] p-0 text-slate-900 shadow-2xl xl:max-w-7xl [&>button]:bg-white/10 [&>button]:text-white [&>button]:backdrop-blur [&>button]:hover:bg-white/20 [&>button]:hover:text-white">
        <div className="overflow-hidden rounded-[inherit]">
          <div className="relative overflow-hidden border-b border-slate-800 bg-slate-950 px-6 py-6 text-white">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-16 top-[-64px] h-48 w-48 rounded-full bg-emerald-400/18 blur-3xl" />
              <div className="absolute left-[-48px] top-12 h-32 w-32 rounded-full bg-amber-400/14 blur-3xl" />
            </div>

            <DialogHeader className="relative space-y-3 text-left">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-14">
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                    Forecast
                  </div>
                  <DialogTitle className="text-2xl font-semibold text-white">
                    {bin ? `Predictions for ${bin.id}` : "Predictions"}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm text-slate-300">
                    Projected fill evolution from the backend prediction endpoint.
                  </DialogDescription>
                </div>

                <Badge className={`${tone.badgeClassName} mr-1 sm:mr-1`}>{tone.label}</Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                {bin ? (
                  <>
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">
                      Type · {BIN_TYPE_LABELS[bin.type]}
                    </span>
                    <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">
                      Status · {bin.status}
                    </span>
                  </>
                ) : null}
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">
                  Horizon · {selectedRangeDays} / {forecastHorizonDays || 0} days
                </span>
                {prediction?.prediction_unit ? (
                  <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">
                    Unit · {prediction.prediction_unit}
                  </span>
                ) : null}
              </div>
            </DialogHeader>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.5fr_0.95fr]">
            <section className="border-b border-slate-200 px-6 py-6 lg:border-b-0 lg:border-r">
              {loading && !prediction ? (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  <span>Loading forecast...</span>
                </div>
              ) : error ? (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-4 rounded-[2rem] border border-rose-200 bg-rose-50 px-6 text-center">
                  <AlertTriangle className="h-6 w-6 text-rose-500" />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-rose-700">Unable to load predictions</div>
                    <p className="text-sm text-rose-600">{error}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                    onClick={onRetry}
                  >
                    Retry
                  </Button>
                </div>
              ) : forecastPoints.length === 0 ? (
                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed border-slate-200 bg-white/80 px-6 text-center">
                  <TrendingUp className="h-6 w-6 text-slate-400" />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-700">No forecast returned</div>
                    <p className="text-sm text-slate-500">
                      The prediction endpoint did not return enough data points for this bin.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Projected Fill
                    </div>
                    <div className="text-sm text-slate-500">
                      One curve, one threshold. The pickup signal is the 80% crossing.
                    </div>
                  </div>
                  <ForecastSparkline points={forecastPoints} />
                </div>
              )}
            </section>

            <aside className="bg-white/75 px-6 py-6">
              <div className="space-y-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                      <ToneIcon className={`h-5 w-5 ${tone.iconClassName}`} />
                    </span>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-900">{tone.label}</div>
                      <p className="text-sm text-slate-500">{tone.description}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white">
                  {metricRows.map((row, index) => (
                    <div
                      key={row.label}
                      className={`flex items-center justify-between gap-3 px-4 py-3 ${
                        index < metricRows.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <span className="text-sm text-slate-500">{row.label}</span>
                      <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-900">Estimated 80% crossing</div>
                    <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                      {(availableRangeOptions.length > 0 ? availableRangeOptions : [3, 6, 9]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedRangeDays(option)}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                            selectedRangeDays === option
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-white"
                          }`}
                        >
                          {option} days
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                      <CalendarDays className="h-5 w-5" />
                    </span>
                    <div className="space-y-1">
                      <div className="text-sm text-slate-500">
                        {overflowPoint
                          ? overflowPoint.dayOffset === 0
                            ? "Already above the collection threshold."
                            : `${overflowPoint.label} · ${overflowPoint.dateLabel}`
                          : `No threshold crossing predicted in the next ${selectedRangeDays} days.`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

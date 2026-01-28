"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BatteryMedium,
  CheckCircle2,
  Loader2,
  PlugZap,
  Radar,
  Signal,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const fillColor = (fill: number) => {
  if (fill >= 80) return "#f25f5c";
  if (fill >= 50) return "#f7b32b";
  return "#2a9d8f";
};

const statusLabel = (fill: number) => {
  if (fill >= 80) return "Full";
  if (fill >= 50) return "Medium";
  return "Low";
};

type WifiNetwork = {
  id: string;
  ssid: string;
  rssi: number;
  secure: boolean;
  channel: number;
  distance: string;
};

const rssiToPercent = (rssi: number) => clamp(Math.round((rssi + 100) * 2), 0, 100);

export default function BinTest() {
  const [deviceAddress, setDeviceAddress] = useState("ws://192.168.0.82:8080");
  const [connected, setConnected] = useState(false);
  const [connectedSsid, setConnectedSsid] = useState<string | null>(null);
  const [fill, setFill] = useState(38);
  const [signal, setSignal] = useState(92);
  const [battery, setBattery] = useState(88);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingSsid, setConnectingSsid] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;

    const interval = setInterval(() => {
      setFill((prev) => clamp(prev + (Math.random() * 10 - 5), 8, 98));
      setSignal((prev) => clamp(prev + (Math.random() * 6 - 3), 70, 100));
      setBattery((prev) => clamp(prev - 0.1, 40, 100));
      setLastUpdate(new Date());
    }, 1500);

    return () => clearInterval(interval);
  }, [connected]);

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdate) return "waiting";
    return lastUpdate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdate]);

  const ringStyle = {
    background: `conic-gradient(${fillColor(fill)} ${fill}%, #e2e8f0 0)`,
  };

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const response = await fetch("/api/wifi/scan", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Scan failed");
      }
      const data = await response.json();
      setNetworks(Array.isArray(data.networks) ? data.networks : []);
    } catch (error) {
      setScanError("Unable to scan WiFi networks.");
    } finally {
      setScanning(false);
    }
  }, []);

  const handleConnect = async (ssid: string) => {
    setConnectingSsid(ssid);
    setScanError(null);
    try {
      const response = await fetch("/api/wifi/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid }),
      });
      if (!response.ok) {
        throw new Error("Connection failed");
      }
      setConnected(true);
      setConnectedSsid(ssid);
      setLastUpdate(new Date());
    } catch (error) {
      setScanError("Unable to connect to the selected bin.");
    } finally {
      setConnectingSsid(null);
    }
  };

  const handleManualToggle = () => {
    setConnected((prev) => {
      const next = !prev;
      if (!next) {
        setConnectedSsid(null);
      } else {
        setLastUpdate(new Date());
      }
      return next;
    });
  };

  useEffect(() => {
    handleScan();
  }, [handleScan]);

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-white/50 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-lg font-semibold">Functional Bin Test</div>
            <div className="text-xs text-slate-500">
              Single-bin functional test for installation verification or troubleshooting
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

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-16 pt-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Functional test bin</div>
                <div className="text-2xl font-semibold">BCN-TEST-001</div>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                  connected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
                )}
              >
                <Activity className="h-3.5 w-3.5" />
                {connected ? "Connected" : "Offline"}
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              WiFi: {connectedSsid ?? "Not connected"}
            </div>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Nearby bins (WiFi)</div>
                    <div className="text-xs text-slate-500">Scan to find nearby smart bins.</div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full border-slate-200 bg-white"
                    onClick={handleScan}
                    disabled={scanning}
                  >
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                    {scanning ? "Scanning..." : "Scan WiFi"}
                  </Button>
                </div>
                {scanError && (
                  <div className="mt-3 text-xs text-rose-600">{scanError}</div>
                )}
                <div className="mt-4 grid gap-2">
                  {networks.length === 0 && !scanning ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                      No nearby bins detected yet.
                    </div>
                  ) : (
                    networks.map((network) => (
                      <div
                        key={network.id}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-xs",
                          connectedSsid === network.ssid
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        )}
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{network.ssid}</div>
                          <div className="text-[11px] text-slate-500">
                            Channel {network.channel} · {network.distance} · {network.secure ? "Secure" : "Open"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-[11px] font-semibold text-slate-500">
                            {rssiToPercent(network.rssi)}%
                          </div>
                          <Button
                            size="sm"
                            className="rounded-full"
                            onClick={() => handleConnect(network.ssid)}
                            disabled={connectingSsid === network.ssid}
                          >
                            {connectedSsid === network.ssid ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" />
                                Connected
                              </>
                            ) : connectingSsid === network.ssid ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Connecting
                              </>
                            ) : (
                              "Connect"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Sensor address (ESP32)</label>
                <input
                  value={deviceAddress}
                  onChange={(event) => setDeviceAddress(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleManualToggle}
                  className={cn(
                    "rounded-full",
                    connected ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-emerald-600 text-white hover:bg-emerald-500"
                  )}
                >
                  <PlugZap className="h-4 w-4" />
                  {connected ? "Disconnect" : "Connect"}
                </Button>
                <Button variant="outline" className="rounded-full border-slate-200 bg-white">
                  <Radar className="h-4 w-4" />
                  Ping sensor
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Wifi className="h-3.5 w-3.5" />
                    WiFi
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{Math.round(signal)}%</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Signal className="h-3.5 w-3.5" />
                    Signal
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">-42 dBm</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <BatteryMedium className="h-3.5 w-3.5" />
                    Battery
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{Math.round(battery)}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">Real-time fill level</div>
                <div className="text-3xl font-semibold text-slate-900">{Math.round(fill)}%</div>
              </div>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  fill >= 80
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : fill >= 50
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                )}
              >
                {statusLabel(fill)}
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="relative h-44 w-44">
                <div className="absolute inset-0 rounded-full" style={ringStyle} />
                <div className="absolute inset-4 rounded-full bg-white shadow-inner" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-semibold text-slate-900">{Math.round(fill)}%</span>
                  <span className="text-xs text-slate-500">volume</span>
                </div>
              </div>
              <div className="w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${fill}%`, backgroundColor: fillColor(fill) }}
                />
              </div>
              <div className="flex w-full items-center justify-between text-xs text-slate-500">
                <span>Last reading</span>
                <span className="font-semibold text-slate-900">{lastUpdateLabel}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur">
            <div className="text-sm text-slate-500">Sensor status</div>
            <div className="mt-3 text-xl font-semibold">Ultrasonic OK</div>
            <p className="mt-2 text-xs text-slate-500">
              Use this mode to verify a new installation or diagnose a failure.
            </p>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur">
            <div className="text-sm text-slate-500">Average latency</div>
            <div className="mt-3 text-xl font-semibold">1.4 s</div>
            <p className="mt-2 text-xs text-slate-500">Test mode simulates a live feed without backend.</p>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg backdrop-blur">
            <div className="text-sm text-slate-500">Last diagnostic</div>
            <div className="mt-3 text-xl font-semibold">No issues detected</div>
            <p className="mt-2 text-xs text-slate-500">All readings are consistent.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

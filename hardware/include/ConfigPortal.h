#pragma once

#include <WebServer.h>

#include "AppConfig.h"
#include "ConfigStore.h"
#include "Measurement.h"
#include "SensorSampler.h"

class ConfigPortal {
public:
    ConfigPortal(ConfigStore &store, SensorSampler &sensor)
        : store_(store), sensor_(sensor), server_(80) {}

    void begin(AppConfig initialConfig) {
        config_ = initialConfig;

        server_.on("/", HTTP_GET, [this]() { handleIndex(); });
        server_.on("/api/status", HTTP_GET, [this]() { handleStatus(); });
        server_.on("/api/config", HTTP_POST, [this]() { handleSaveConfig(); });
        server_.begin();
    }

    void loop() { server_.handleClient(); }

private:
    static String readArg(WebServer &server, const char *name) {
        return server.hasArg(name) ? server.arg(name) : "";
    }

    void handleStatus() {
        const DistanceMeasurement measurement = sensor_.sampleMedian(5);

        String body = "{";
        body += "\"distance_cm\":";
        body += measurement.valid ? String(measurement.distanceCm, 1) : "null";
        body += ",\"bin_id\":\"";
        body += config_.binId;
        body += "\",\"bin_depth_cm\":";
        body += String(config_.binDepthCm, 1);
        body += ",\"wifi_ssid\":\"";
        body += config_.wifiSsid;
        body += "\",\"backend_url\":\"";
        body += config_.backendBaseUrl;
        body += "\"}";

        server_.send(200, "application/json", body);
    }

    void handleSaveConfig() {
        AppConfig updated = config_;
        const String wifiSsid = readArg(server_, "wifi_ssid");
        const String wifiPassword = readArg(server_, "wifi_password");
        const String backendUrl = readArg(server_, "backend_url");
        const String binId = readArg(server_, "bin_id");
        const String binDepth = readArg(server_, "bin_depth_cm");
        const String sleepSeconds = readArg(server_, "sleep_seconds");

        if (!wifiSsid.isEmpty()) {
            updated.wifiSsid = wifiSsid;
        }

        if (!wifiPassword.isEmpty()) {
            updated.wifiPassword = wifiPassword;
        }

        if (!backendUrl.isEmpty()) {
            updated.backendBaseUrl = backendUrl;
        }
        if (server_.hasArg("bin_id")) {
            updated.binId = binId;
        }
        if (server_.hasArg("bin_depth_cm") && !binDepth.isEmpty()) {
            updated.binDepthCm = binDepth.toFloat();
        }

        if (!sleepSeconds.isEmpty()) {
            updated.sleepSeconds = static_cast<uint32_t>(sleepSeconds.toInt());
        }

        if (!updated.isProvisioned()) {
            server_.send(400, "application/json",
                         "{\"saved\":false,\"error\":\"invalid configuration\"}");
            return;
        }

        config_ = updated;
        store_.save(config_);
        server_.send(200, "application/json", "{\"saved\":true}");
    }

    void handleIndex() {
        server_.send(200, "text/html", page());
    }

    String page() const {
        String html = R"html(
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SmartBin Setup</title>
  <style>
    :root {
      --bg: #f2efe8;
      --panel: #fffdf7;
      --ink: #1c1917;
      --accent: #0f766e;
      --line: #d6d3d1;
      --muted: #57534e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top right, rgba(15, 118, 110, 0.16), transparent 34%),
        linear-gradient(180deg, #f7f3ea 0%, var(--bg) 100%);
      color: var(--ink);
      min-height: 100vh;
      padding: 24px;
    }
    .panel {
      max-width: 720px;
      margin: 0 auto;
      background: rgba(255, 253, 247, 0.94);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 50px rgba(28, 25, 23, 0.08);
    }
    h1 { margin: 0 0 8px; font-size: 2rem; }
    p { color: var(--muted); }
    form { display: grid; gap: 14px; margin: 24px 0; }
    label { display: grid; gap: 6px; font-weight: 600; }
    input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      background: white;
    }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; }
    button {
      border: 0;
      border-radius: 999px;
      padding: 12px 18px;
      font: inherit;
      font-weight: 700;
      background: var(--accent);
      color: white;
      cursor: pointer;
    }
    button.secondary { background: #292524; }
    .card {
      margin-top: 18px;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.7);
    }
    .metric { font-size: 2rem; font-weight: 700; margin: 8px 0; }
    .muted { color: var(--muted); }
  </style>
</head>
<body>
  <main class="panel">
    <h1>SmartBin Setup</h1>
    <p>Configure Wi-Fi, backend connectivity, and optional local defaults for registration.</p>

    <form id="configForm">
      <label>Wi-Fi SSID<input name="wifi_ssid" value="%WIFI_SSID%" required></label>
      <label>Wi-Fi Password<input name="wifi_password" type="password" value="%WIFI_PASSWORD%" required></label>
      <label>Backend URL<input name="backend_url" value="%BACKEND_URL%" placeholder="http://192.168.1.10:3000" required></label>
      <label>Bin ID<input name="bin_id" value="%BIN_ID%" placeholder="leave empty for auto-registration"></label>
      <label>Bin Depth (cm)<input name="bin_depth_cm" type="number" min="1" step="0.1" value="%BIN_DEPTH%"></label>
      <label>Sleep Interval (seconds)<input name="sleep_seconds" type="number" min="60" step="1" value="%SLEEP_SECONDS%"></label>
      <div class="actions">
        <button type="submit">Save Configuration</button>
      </div>
    </form>

    <section class="card">
      <div class="muted">Live Sensor Reading</div>
      <div class="metric" id="distanceMetric">--</div>
      <div class="muted" id="distanceDetail">Distance: --</div>
      <div class="muted" id="binIdValue">Bin ID: --</div>
      <div class="muted" id="statusText">Status idle.</div>
    </section>
  </main>

  <script>
    async function refreshStatus() {
      const response = await fetch('/api/status');
      const data = await response.json();
      document.getElementById('distanceMetric').textContent =
        data.distance_cm == null ? '--' : `${data.distance_cm} cm`;
      document.getElementById('distanceDetail').textContent =
        data.distance_cm == null ? 'Distance: unavailable' : `Distance: ${data.distance_cm} cm`;
      document.getElementById('binIdValue').textContent =
        `Bin ID: ${data.bin_id || 'missing'}`;
      document.getElementById('statusText').textContent =
        data.bin_id ? `Bin ready. Depth ${data.bin_depth_cm} cm.` : 'Waiting for registration.';
    }

    document.getElementById('configForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.target);
      const response = await fetch('/api/config', { method: 'POST', body: new URLSearchParams(form) });
      const data = await response.json();
      document.getElementById('statusText').textContent = data.saved ? 'Configuration saved.' : data.error;
      refreshStatus();
    });

    setInterval(refreshStatus, 2500);
    refreshStatus();
  </script>
</body>
</html>
)html";

        html.replace("%WIFI_SSID%", escapeHtml(config_.wifiSsid));
        html.replace("%WIFI_PASSWORD%", escapeHtml(config_.wifiPassword));
        html.replace("%BACKEND_URL%", escapeHtml(config_.backendBaseUrl));
        html.replace("%BIN_ID%", escapeHtml(config_.binId));
        html.replace("%BIN_DEPTH%", String(config_.binDepthCm, 1));
        html.replace("%SLEEP_SECONDS%", String(config_.sleepSeconds));
        return html;
    }

    static String escapeHtml(const String &input) {
        String escaped = input;
        escaped.replace("&", "&amp;");
        escaped.replace("\"", "&quot;");
        escaped.replace("<", "&lt;");
        escaped.replace(">", "&gt;");
        return escaped;
    }

    ConfigStore &store_;
    SensorSampler &sensor_;
    WebServer server_;
    AppConfig config_;
};

#pragma once

#include <WiFi.h>

#include "AppConfig.h"
#include "DeviceConfig.h"

class WiFiManager {
public:
    bool connect(const AppConfig &config) const {
        const String primarySsid = config.wifiSsid;
        const String primaryPassword = config.wifiPassword;

        if (tryConnect(primarySsid, primaryPassword)) {
            return true;
        }

        const String fallbackSsid = String(DeviceDefaults::kDefaultWifiSsid);
        const String fallbackPassword = String(DeviceDefaults::kDefaultWifiPassword);

        const bool fallbackDefined = !fallbackSsid.isEmpty();
        const bool isDifferentFromPrimary =
            fallbackSsid != primarySsid || fallbackPassword != primaryPassword;

        if (fallbackDefined && isDifferentFromPrimary) {
            return tryConnect(fallbackSsid, fallbackPassword);
        }

        return false;
    }

    void disconnect() const { WiFi.disconnect(true, true); }

    void startAccessPoint() const {
        WiFi.mode(WIFI_AP);
        WiFi.softAP(DeviceDefaults::kAccessPointSsid, DeviceDefaults::kAccessPointPassword);
    }

private:
    static bool tryConnect(const String &ssid, const String &password) {
        if (ssid.isEmpty()) {
            return false;
        }

        WiFi.mode(WIFI_STA);
        WiFi.setSleep(true);
        WiFi.begin(ssid.c_str(), password.c_str());

        const uint32_t startMs = millis();
        while (WiFi.status() != WL_CONNECTED &&
               millis() - startMs < DeviceDefaults::kWifiConnectTimeoutMs) {
            delay(250);
        }

        return WiFi.status() == WL_CONNECTED;
    }
};

#pragma once

#include <WiFi.h>

#include "AppConfig.h"
#include "DeviceConfig.h"

class WiFiManager {
public:
    bool connect(const AppConfig &config) const {
        WiFi.mode(WIFI_STA);
        WiFi.setSleep(true);
        WiFi.begin(config.wifiSsid.c_str(), config.wifiPassword.c_str());

        const uint32_t startMs = millis();
        while (WiFi.status() != WL_CONNECTED &&
               millis() - startMs < DeviceDefaults::kWifiConnectTimeoutMs) {
            delay(250);
        }

        return WiFi.status() == WL_CONNECTED;
    }

    void disconnect() const { WiFi.disconnect(true, true); }

    void startAccessPoint() const {
        WiFi.mode(WIFI_AP);
        WiFi.softAP(DeviceDefaults::kAccessPointSsid, DeviceDefaults::kAccessPointPassword);
    }
};

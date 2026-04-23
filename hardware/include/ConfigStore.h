#pragma once

#include <Preferences.h>

#include "AppConfig.h"
#include "DeviceConfig.h"

class ConfigStore {
public:
    bool begin() {
        return preferences_.begin(DeviceDefaults::kConfigNamespace, false);
    }

    void end() { preferences_.end(); }

    AppConfig load() const {
        AppConfig config;
        config.wifiSsid = preferences_.getString("wifi_ssid", DeviceDefaults::kDefaultWifiSsid);
        config.wifiPassword =
            preferences_.getString("wifi_pass", DeviceDefaults::kDefaultWifiPassword);
        config.backendBaseUrl =
            preferences_.getString("backend_url", DeviceDefaults::kDefaultBackendBaseUrl);
        config.binId = preferences_.getString("bin_id", DeviceDefaults::kDefaultBinId);
        config.binDepthCm =
            preferences_.getFloat("bin_depth", DeviceDefaults::kDefaultBinDepthCm);
        config.sleepSeconds =
            preferences_.getUInt("sleep_s", DeviceDefaults::kDefaultSleepSeconds);
        return config;
    }

    void save(const AppConfig &config) {
        preferences_.putString("wifi_ssid", config.wifiSsid);
        preferences_.putString("wifi_pass", config.wifiPassword);
        preferences_.putString("backend_url", config.backendBaseUrl);
        preferences_.putString("bin_id", config.binId);
        preferences_.putFloat("bin_depth", config.binDepthCm);
        preferences_.putUInt("sleep_s", config.sleepSeconds);
    }

    void saveBinId(const String &binId) {
        preferences_.putString("bin_id", binId);
    }

private:
    mutable Preferences preferences_;
};

#pragma once

#include <Arduino.h>

struct AppConfig {
    String wifiSsid;
    String wifiPassword;
    String backendBaseUrl;
    String binId;
    float binDepthCm = 100.0F;
    uint32_t sleepSeconds = 900;

    bool isProvisioned() const {
        return !wifiSsid.isEmpty() && !backendBaseUrl.isEmpty() && sleepSeconds > 0;
    }

    String measurementUrl() const {
        return normalizedBackendBaseUrl() + "/bins/" + binId + "/measurements";
    }

    String registrationUrl() const {
        return normalizedBackendBaseUrl() + "/bins";
    }

    String backendBaseUrlNormalized() const {
        return normalizedBackendBaseUrl();
    }

private:
    String normalizedBackendBaseUrl() const {
        String url = backendBaseUrl;
        url.trim();

        while (url.endsWith("/")) {
            url.remove(url.length() - 1);
        }

        return url;
    }
};

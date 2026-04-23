#pragma once

#include <Arduino.h>

struct DistanceMeasurement {
    float distanceCm = 0.0F;
    bool valid = false;
};

struct TelemetryPayload {
    float rawDistanceCm = 0.0F;
    int batteryLevelPercent = 100;

    TelemetryPayload() = default;
    TelemetryPayload(float rawDistanceCmValue, int batteryLevelPercentValue)
        : rawDistanceCm(rawDistanceCmValue),
          batteryLevelPercent(batteryLevelPercentValue) {}
};

struct RegistrationPayload {
    String deviceUid;
    float depthCm = 100.0F;
    int batteryLevelPercent = 100;

    RegistrationPayload() = default;
    RegistrationPayload(String deviceUidValue, float depthCmValue, int batteryLevelPercentValue)
        : deviceUid(deviceUidValue),
          depthCm(depthCmValue),
          batteryLevelPercent(batteryLevelPercentValue) {}
};

struct RegistrationResult {
    String binId;
    float depthCm = 0.0F;
    bool success = false;
};

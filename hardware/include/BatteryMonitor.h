#pragma once

#include <Arduino.h>

#include "DeviceConfig.h"

class BatteryMonitor {
public:
    void begin() const {
        if (DevicePins::kBatteryAdc >= 0) {
            analogReadResolution(12);
            pinMode(DevicePins::kBatteryAdc, INPUT);
        }
    }

    float readVoltage() const {
        if (DevicePins::kBatteryAdc < 0) {
            return -1.0F;
        }

        const int raw = analogRead(DevicePins::kBatteryAdc);
        const float adcVoltage = (static_cast<float>(raw) / 4095.0F) * 3.3F;

        return adcVoltage * 2.0F;
    }

    int readPercentage() const {
        const float voltage = readVoltage();
        if (voltage < 0.0F) {
            return DeviceDefaults::kDefaultBatteryPercent;
        }

        const float normalized =
            (voltage - DeviceDefaults::kBatteryVoltageMin) /
            (DeviceDefaults::kBatteryVoltageMax - DeviceDefaults::kBatteryVoltageMin);

        return static_cast<int>(constrain(lround(normalized * 100.0F), 1L, 100L));
    }
};

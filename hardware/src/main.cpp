#include <Arduino.h>
#include <WiFi.h>

#include "AppConfig.h"
#include "BatteryMonitor.h"
#include "ConfigPortal.h"
#include "ConfigStore.h"
#include "DeviceConfig.h"
#include "Measurement.h"
#include "PowerManager.h"
#include "SensorSampler.h"
#include "TelemetryClient.h"
#include "WiFiManager.h"

namespace {

enum class BootAction {
    kMeasure,
    kConfigPortal,
    kFactoryReset,
};

ConfigStore gStore;
SensorSampler gSensor(DevicePins::kTrig, DevicePins::kEcho);
BatteryMonitor gBattery;
WiFiManager gWiFi;
TelemetryClient gTelemetry;
PowerManager gPower;
ConfigPortal *gPortal = nullptr;

String getDeviceUid() {
    const uint64_t chipId = ESP.getEfuseMac();
    char buffer[24];
    snprintf(buffer, sizeof(buffer), "ESP32-%04X%08X", static_cast<uint16_t>(chipId >> 32),
             static_cast<uint32_t>(chipId));
    return String(buffer);
}

void waitForButtonRelease() {
    while (digitalRead(DevicePins::kButton) == LOW) {
        delay(10);
    }
}

BootAction readBootAction() {
    const uint32_t detectStart = millis();
    while (digitalRead(DevicePins::kButton) != LOW &&
           millis() - detectStart < DeviceDefaults::kButtonDetectionWindowMs) {
        delay(10);
    }

    if (digitalRead(DevicePins::kButton) != LOW) {
        Serial.println("Boot action: measure (button not pressed).");
        return BootAction::kMeasure;
    }

    const uint32_t pressedAt = millis();
    uint32_t heldFor = 0;
    Serial.println("Button press detected. Measuring hold duration...");
    while (digitalRead(DevicePins::kButton) == LOW) {
        heldFor = millis() - pressedAt;
        if (heldFor >= DeviceDefaults::kButtonHoldForFactoryResetMs) {
            Serial.println("Boot action: factory reset.");
            return BootAction::kFactoryReset;
        }
        delay(10);
    }

    if (heldFor >= DeviceDefaults::kButtonHoldForConfigMs) {
        Serial.println("Boot action: config portal.");
        return BootAction::kConfigPortal;
    }

    Serial.println("Boot action: measure (short button press).");
    return BootAction::kMeasure;
}

void logReading(float distanceCm, int batteryPercent, float batteryVoltage) {
    Serial.print("Distance cm: ");
    Serial.println(distanceCm, 2);
    Serial.print("Battery %: ");
    Serial.println(batteryPercent);
    if (batteryVoltage >= 0.0F) {
        Serial.print("Battery V: ");
        Serial.println(batteryVoltage, 2);
    }
}

bool runMeasurementCycle(const AppConfig &config) {
    AppConfig runtimeConfig = config;
    const DistanceMeasurement measurement =
        gSensor.sampleMedian(DeviceDefaults::kMeasurementSamples);
    if (!measurement.valid) {
        Serial.println("Ultrasonic measurement failed.");
        return false;
    }

    const int batteryPercent = gBattery.readPercentage();
    const float batteryVoltage = gBattery.readVoltage();
    logReading(measurement.distanceCm, batteryPercent, batteryVoltage);

    if (!gWiFi.connect(runtimeConfig)) {
        Serial.println("Wi-Fi connection failed.");
        return false;
    }

    if (runtimeConfig.binId.isEmpty()) {
        const RegistrationResult registration = gTelemetry.registerDevice(
            runtimeConfig,
            RegistrationPayload(getDeviceUid(), runtimeConfig.binDepthCm, batteryPercent));
        if (!registration.success) {
            gWiFi.disconnect();
            Serial.println("Device registration failed.");
            return false;
        }

        runtimeConfig.binId = registration.binId;
        if (registration.depthCm > 0.0F) {
            runtimeConfig.binDepthCm = registration.depthCm;
        }
        gStore.save(runtimeConfig);

        Serial.print("Assigned bin ID: ");
        Serial.println(runtimeConfig.binId);
    }

    const TelemetryPayload payload(measurement.distanceCm, batteryPercent);
    const bool telemetrySent = gTelemetry.sendMeasurement(runtimeConfig, payload);
    gWiFi.disconnect();

    if (!telemetrySent) {
        Serial.println("Telemetry upload failed.");
        return false;
    }

    Serial.println("Telemetry uploaded successfully.");
    return true;
}
[[noreturn]] void enterConfigMode(AppConfig config) {
    Serial.println("Starting configuration portal.");
    gWiFi.startAccessPoint();

    static ConfigPortal portal(gStore, gSensor);
    gPortal = &portal;
    gPortal->begin(config);

    for (;;) {
        gPortal->loop();
        delay(10);
    }
}

[[noreturn]] void factoryResetAndEnterConfigMode(const AppConfig &config) {
    if (!config.binId.isEmpty() && config.isProvisioned()) {
        Serial.println("Factory reset requested. Attempting backend reset first...");
        if (gWiFi.connect(config)) {
            const bool backendReset = gTelemetry.factoryResetBin(config, true);
            gWiFi.disconnect();
            Serial.println(backendReset ? "Backend factory reset completed."
                                        : "Backend factory reset failed.");
        } else {
            Serial.println("Wi-Fi unavailable. Skipping backend factory reset.");
        }
    } else {
        Serial.println("No registered bin ID found. Skipping backend factory reset.");
    }

    Serial.println("Clearing local configuration...");
    const bool cleared = gStore.factoryReset();
    Serial.println(cleared ? "Factory reset completed." : "Factory reset failed.");
    const AppConfig resetConfig = gStore.load();
    enterConfigMode(resetConfig);
}

} // namespace

void setup() {
    Serial.begin(115200);
    delay(200);

    pinMode(DevicePins::kButton, INPUT_PULLUP);
    gSensor.begin();
    gBattery.begin();

    if (!gStore.begin()) {
        Serial.println("Preferences init failed.");
        return;
    }

    const AppConfig config = gStore.load();
    const BootAction bootAction = readBootAction();

    if (bootAction == BootAction::kFactoryReset) {
        waitForButtonRelease();
        factoryResetAndEnterConfigMode(config);
    }

    if (bootAction == BootAction::kConfigPortal || !config.isProvisioned()) {
        enterConfigMode(config);
    }

    bool cycleSuccessful = false;
    cycleSuccessful = runMeasurementCycle(config);

    waitForButtonRelease();

    const uint32_t sleepSeconds = cycleSuccessful ? config.sleepSeconds
                                                  : DeviceDefaults::kRecoverySleepSeconds;

    Serial.print("Entering deep sleep for ");
    Serial.print(sleepSeconds);
    Serial.println(" seconds.");

    gStore.end();
    gPower.sleepForSeconds(sleepSeconds);
}

void loop() {}

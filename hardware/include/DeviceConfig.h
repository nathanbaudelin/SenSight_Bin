#pragma once

#include <Arduino.h>

#ifndef SMARTBIN_WIFI_SSID
#define SMARTBIN_WIFI_SSID ""
#endif

#ifndef SMARTBIN_WIFI_PASSWORD
#define SMARTBIN_WIFI_PASSWORD ""
#endif

#ifndef SMARTBIN_BACKEND_URL
#define SMARTBIN_BACKEND_URL "http://192.168.1.10:3000"
#endif

#ifndef SMARTBIN_BIN_ID
#define SMARTBIN_BIN_ID ""
#endif

#ifndef SMARTBIN_SLEEP_SECONDS
#define SMARTBIN_SLEEP_SECONDS 900
#endif

#ifndef SMARTBIN_BIN_DEPTH_CM
#define SMARTBIN_BIN_DEPTH_CM 100.0F
#endif

namespace DevicePins {
constexpr uint8_t kTrig = 12;
constexpr uint8_t kEcho = 14;
constexpr uint8_t kButton = 0;
constexpr int8_t kBatteryAdc = -1;
} // namespace DevicePins

namespace DeviceDefaults {
constexpr char kAccessPointSsid[] = "ESP32_SmartWasteBin";
constexpr char kAccessPointPassword[] = "password123";
constexpr char kConfigNamespace[] = "smartbin";
constexpr char kDefaultWifiSsid[] = SMARTBIN_WIFI_SSID;
constexpr char kDefaultWifiPassword[] = SMARTBIN_WIFI_PASSWORD;
constexpr char kDefaultBinId[] = SMARTBIN_BIN_ID;
constexpr char kDefaultBackendBaseUrl[] = SMARTBIN_BACKEND_URL;
constexpr float kDefaultBinDepthCm = SMARTBIN_BIN_DEPTH_CM;
constexpr uint32_t kDefaultSleepSeconds = SMARTBIN_SLEEP_SECONDS;
constexpr uint8_t kDefaultBatteryPercent = 100;
constexpr float kBatteryVoltageMin = 3.30F;
constexpr float kBatteryVoltageMax = 4.20F;
constexpr uint16_t kHttpTimeoutMs = 8000;
constexpr uint8_t kMeasurementSamples = 7;
constexpr float kSensorMinDistanceCm = 2.0F;
constexpr float kSensorMaxDistanceCm = 400.0F;
constexpr uint32_t kWifiConnectTimeoutMs = 20000;
constexpr uint32_t kButtonHoldForConfigMs = 1200;
constexpr uint32_t kButtonHoldForFactoryResetMs = 10000;
constexpr uint32_t kButtonDetectionWindowMs = 5000;
constexpr uint32_t kRecoverySleepSeconds = 120;
} // namespace DeviceDefaults

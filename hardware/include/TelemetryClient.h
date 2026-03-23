#pragma once

#include <HTTPClient.h>
#include <WiFiClient.h>

#include "AppConfig.h"
#include "DeviceConfig.h"
#include "Measurement.h"

class TelemetryClient {
public:
    RegistrationResult registerDevice(const AppConfig &config,
                                      const RegistrationPayload &payload) const {
        WiFiClient client;
        HTTPClient http;

        if (!http.begin(client, config.registrationUrl())) {
            return {};
        }

        http.setTimeout(DeviceDefaults::kHttpTimeoutMs);
        http.addHeader("Content-Type", "application/json");

        const String body = buildRegistrationBody(payload);
        const int statusCode = http.POST(body);
        const String responseBody = statusCode > 0 ? http.getString() : "";
        http.end();

        if (statusCode < 200 || statusCode >= 300) {
            return {};
        }

        RegistrationResult result;
        result.binId = extractJsonString(responseBody, "bin_id");
        result.depthCm = extractJsonFloat(responseBody, "depth");
        result.success = !result.binId.isEmpty();
        return result;
    }

    bool sendMeasurement(const AppConfig &config, const TelemetryPayload &payload) const {
        WiFiClient client;
        HTTPClient http;

        if (!http.begin(client, config.measurementUrl())) {
            return false;
        }

        http.setTimeout(DeviceDefaults::kHttpTimeoutMs);
        http.addHeader("Content-Type", "application/json");

        const String body = buildMeasurementBody(payload);
        const int statusCode = http.POST(body);
        http.end();

        return statusCode >= 200 && statusCode < 300;
    }

private:
    static String buildRegistrationBody(const RegistrationPayload &payload) {
        String body = "{\"device_uid\":\"";
        body += escapeJson(payload.deviceUid);
        body += "\",\"depth\":";
        body += String(payload.depthCm, 1);
        body += ",\"battery_level\":";
        body += String(payload.batteryLevelPercent);
        body += "}";
        return body;
    }

    static String buildMeasurementBody(const TelemetryPayload &payload) {
        String body = "{\"filling_level\":";
        body += String(payload.rawDistanceCm, 1);
        body += ",\"battery_level\":";
        body += String(payload.batteryLevelPercent);
        body += "}";
        return body;
    }

    static String extractJsonString(const String &json, const char *key) {
        String pattern = "\"";
        pattern += key;
        pattern += "\":\"";

        const int start = json.indexOf(pattern);
        if (start < 0) {
            return "";
        }

        const int valueStart = start + pattern.length();
        const int valueEnd = json.indexOf('\"', valueStart);
        if (valueEnd < 0) {
            return "";
        }

        return json.substring(valueStart, valueEnd);
    }

    static float extractJsonFloat(const String &json, const char *key) {
        String pattern = "\"";
        pattern += key;
        pattern += "\":";

        const int start = json.indexOf(pattern);
        if (start < 0) {
            return 0.0F;
        }

        const int valueStart = start + pattern.length();
        int valueEnd = valueStart;
        while (valueEnd < static_cast<int>(json.length()) && json[valueEnd] != ',' &&
               json[valueEnd] != '}') {
            ++valueEnd;
        }

        return json.substring(valueStart, valueEnd).toFloat();
    }

    static String escapeJson(const String &input) {
        String escaped;
        escaped.reserve(input.length());

        for (size_t index = 0; index < input.length(); ++index) {
            const char current = input[index];
            if (current == '\\' || current == '\"') {
                escaped += '\\';
            }
            escaped += current;
        }

        return escaped;
    }
};

#pragma once

#include <Arduino.h>
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
        const String endpoint = config.registrationUrl();

        if (!http.begin(client, endpoint)) {
            Serial.println("HTTP begin failed for registration endpoint.");
            return {};
        }

        http.setTimeout(DeviceDefaults::kHttpTimeoutMs);
        http.addHeader("Content-Type", "application/json");

        const String body = buildRegistrationBody(payload);
        Serial.print("POST ");
        Serial.println(endpoint);
        Serial.print("Registration payload: ");
        Serial.println(body);

        const int statusCode = http.POST(body);
        const String responseBody = statusCode > 0 ? http.getString() : "";
        Serial.print("Registration status: ");
        Serial.println(statusCode);
        if (!responseBody.isEmpty()) {
            Serial.print("Registration response: ");
            Serial.println(responseBody);
        }
        http.end();

        if (statusCode < 200 || statusCode >= 300) {
            return {};
        }

        RegistrationResult result;
        const int dataStart = findJsonObjectStart(responseBody, "data");
        result.binId = extractJsonString(responseBody, "bin_id");
        if (result.binId.isEmpty()) {
            result.binId = extractJsonString(responseBody, "id", dataStart);
        }
        result.depthCm = extractJsonFloat(responseBody, "depth", dataStart);
        if (result.depthCm <= 0.0F) {
            result.depthCm = extractJsonFloat(responseBody, "depth");
        }
        result.success = !result.binId.isEmpty();
        return result;
    }

    bool sendMeasurement(const AppConfig &config, const TelemetryPayload &payload) const {
        WiFiClient client;
        HTTPClient http;
        const String endpoint = config.measurementUrl();

        if (!http.begin(client, endpoint)) {
            Serial.println("HTTP begin failed for measurement endpoint.");
            return false;
        }

        http.setTimeout(DeviceDefaults::kHttpTimeoutMs);
        http.addHeader("Content-Type", "application/json");

        const String body = buildMeasurementBody(payload);
        Serial.print("POST ");
        Serial.println(endpoint);
        Serial.print("Measurement payload: ");
        Serial.println(body);

        const int statusCode = http.POST(body);
        const String responseBody = statusCode > 0 ? http.getString() : "";
        Serial.print("Measurement status: ");
        Serial.println(statusCode);
        if (!responseBody.isEmpty()) {
            Serial.print("Measurement response: ");
            Serial.println(responseBody);
        }
        http.end();

        return statusCode >= 200 && statusCode < 300;
    }

    bool factoryResetBin(const AppConfig &config, bool purgeHistory = true) const {
        if (config.binId.isEmpty()) {
            return true;
        }

        WiFiClient client;
        HTTPClient http;

        const String endpoint = config.backendBaseUrlNormalized() + "/bins/" +
                                config.binId + "/factory-reset?purgeHistory=" +
                                String(purgeHistory ? "true" : "false");

        if (!http.begin(client, endpoint)) {
            Serial.println("HTTP begin failed for factory reset endpoint.");
            return false;
        }

        http.setTimeout(DeviceDefaults::kHttpTimeoutMs);
        Serial.print("PUT ");
        Serial.println(endpoint);
        const int statusCode = http.sendRequest("PUT", "");
        const String responseBody = statusCode > 0 ? http.getString() : "";
        Serial.print("Factory reset status: ");
        Serial.println(statusCode);
        if (!responseBody.isEmpty()) {
            Serial.print("Factory reset response: ");
            Serial.println(responseBody);
        }
        http.end();

        return statusCode >= 200 && statusCode < 300;
    }

private:
    static String buildRegistrationBody(const RegistrationPayload &payload) {
        String body = "{\"device_uid\":\"";
        body += escapeJson(payload.deviceUid);
        body += "\",\"type\":\"unknown\",\"status\":\"unverified";
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

    static int findJsonObjectStart(const String &json, const char *key) {
        String pattern = "\"";
        pattern += key;
        pattern += "\":{";

        return json.indexOf(pattern);
    }

    static String extractJsonString(const String &json, const char *key, int fromIndex = 0) {
        String pattern = "\"";
        pattern += key;
        pattern += "\":\"";

        const int start = json.indexOf(pattern, max(fromIndex, 0));
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

    static float extractJsonFloat(const String &json, const char *key, int fromIndex = 0) {
        String pattern = "\"";
        pattern += key;
        pattern += "\":";

        const int start = json.indexOf(pattern, max(fromIndex, 0));
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

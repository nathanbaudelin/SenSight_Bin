#pragma once

#include <Arduino.h>

#include "DeviceConfig.h"
#include "Measurement.h"

class SensorSampler {
public:
    SensorSampler(uint8_t trigPin, uint8_t echoPin) : trigPin_(trigPin), echoPin_(echoPin) {}

    void begin() const {
        pinMode(trigPin_, OUTPUT);
        pinMode(echoPin_, INPUT);
        digitalWrite(trigPin_, LOW);
    }

    DistanceMeasurement sampleMedian(uint8_t sampleCount) const {
        constexpr uint8_t kMaxSamples = 15;
        float samples[kMaxSamples];
        uint8_t validCount = 0;
        sampleCount = min(sampleCount, kMaxSamples);

        for (uint8_t index = 0; index < sampleCount; ++index) {
            DistanceMeasurement reading = sampleOnce();
            if (reading.valid) {
                samples[validCount++] = reading.distanceCm;
            }
            delay(40);
        }

        if (validCount == 0) {
            return {};
        }

        sort(samples, validCount);
        DistanceMeasurement result;
        result.valid = true;
        result.distanceCm = samples[validCount / 2];
        return result;
    }

    DistanceMeasurement sampleOnce() const {
        digitalWrite(trigPin_, LOW);
        delayMicroseconds(3);
        digitalWrite(trigPin_, HIGH);
        delayMicroseconds(10);
        digitalWrite(trigPin_, LOW);

        unsigned long duration = pulseIn(echoPin_, HIGH, 30000UL);
        if (duration == 0) {
            return {};
        }

        float distanceCm = (duration * 0.0343F) / 2.0F;
        if (distanceCm < DeviceDefaults::kSensorMinDistanceCm ||
            distanceCm > DeviceDefaults::kSensorMaxDistanceCm) {
            return {};
        }

        DistanceMeasurement result;
        result.valid = true;
        result.distanceCm = distanceCm;
        return result;
    }

private:
    static void sort(float *values, uint8_t count) {
        for (uint8_t i = 0; i < count; ++i) {
            for (uint8_t j = i + 1; j < count; ++j) {
                if (values[j] < values[i]) {
                    float temp = values[i];
                    values[i] = values[j];
                    values[j] = temp;
                }
            }
        }
    }

    uint8_t trigPin_;
    uint8_t echoPin_;
};

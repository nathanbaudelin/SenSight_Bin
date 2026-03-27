#pragma once

#include <esp_sleep.h>

#include "DeviceConfig.h"

class PowerManager {
public:
    void sleepForSeconds(uint32_t seconds) const {
        esp_sleep_enable_timer_wakeup(static_cast<uint64_t>(seconds) * 1000000ULL);
        esp_sleep_enable_ext0_wakeup(static_cast<gpio_num_t>(DevicePins::kButton), LOW);
        esp_deep_sleep_start();
    }
};

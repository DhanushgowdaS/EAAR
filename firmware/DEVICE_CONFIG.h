#ifndef EAAR_DEVICE_CONFIG_H
#define EAAR_DEVICE_CONFIG_H

// ============================================================
// EAAR DEVICE CONFIGURATION
// Central configuration for ESP32 devices
// ============================================================

// -------------------- ESP32-S3 --------------------
#define S3_DEVICE_NAME       "EAAR-ESP32-S3"
#define S3_IP_ADDRESS        "10.102.214.176"
#define S3_MAC_ADDRESS       "C0:4E:30:08:4A:20"

// -------------------- ESP32 DevKit ----------------
#define DEVKIT_DEVICE_NAME   "EAAR-ESP32-DEVKIT"
#define DEVKIT_IP_ADDRESS    "N/A"
#define DEVKIT_MAC_ADDRESS   "6C:C8:40:56:C6:78"

// -------------------- Communication ---------------
#define DEVICE_LINK_TYPE     "ESP-NOW"
#define S3_GATEWAY_URL       "http://10.102.214.176"

// ============================================================

#endif

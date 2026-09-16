# Autonomous Industrial Worker Safety Monitoring Platform

## Overview

This project is an IoT-enabled, autonomous worker safety wearable designed for high-risk industrial environments such as manufacturing, mining, and construction. 

Conventional safety systems depend heavily on manual panic buttons. If a worker suffers an electrical shock, a high-impact fall, or a heat-induced seizure, they are often physically unable to trigger an alert. This platform provides an automated sensor-fusion engine that requires zero human intervention. By fusing kinetic, cardiac, and electrodermal signatures in real time, the device detects life-threatening crises instantly, alerts floor managers, and logs a high-resolution time-series timeline for industrial medical review.

---

## Hardware Architecture & Pin Mapping

The system uses an ESP32-CAM core with the camera ribbon cable detached to free up the GPIO bus, reduce data conflicts, and lower power consumption.

| Sensor Component | Modality / Vital Sign | Interface Type | Microcontroller Pin Connection |

| MAX30102 (Black) | Heart Rate (HR), HRV, SpO2 | Digital I2C (SDA) | GPIO 14 |
| MAX30102 (Black) | Heart Rate (HR), HRV, SpO2 | Digital I2C (SCL) | GPIO 15 |
| MPU6050 (GY-521) | Kinetic Tremor / Fall G-Force | Digital I2C (SDA) | GPIO 14 (Shared I2C address) |
| MPU6050 (GY-521) | Kinetic Tremor / Fall G-Force | Digital I2C (SCL) | GPIO 15 (Shared I2C address) |
| Grove GSR Board | Electrodermal Activity (EDA) | Analog Input | GPIO 12 (ADC2 Stable Channel) |
| Power Infrastructure | Common Rail Distribution | Power | 3.3V / GND |

---

## Core System Architecture & Logic

### 1. Edge Serialization Protocol (`firmware.ino`)
* **Bus Configuration:** Manually instantiates the I2C bus at 400kHz Fast Mode on pins SDA=14 and SCL=15.
* **Data Aggregation:** Samples infrared/red arrays from the MAX30102, 3-axis positional acceleration matrices from the MPU6050, and 12-bit ADC voltage from the GSR module.
* **Streaming Engine:** Serializes inputs into a comma-separated string packet (`GSR,Accel,HR\n`) routed via hardware serial at 115200 baud with a strict 5Hz sampling loop (200ms delay).

### 2. Telemetry, Sensor Fusion & Alert Engine (`main.py`)
* **Dynamic Data Fusion:** A Python script processes incoming strings and evaluates a combined matrix to minimize false positives:
  * `Autonomous Trigger = (Kinetic Motion > 3.5g) AND (EDA Conductivity > 1800) AND (Heart Rate > 115 BPM)`
* **Crisis Simulation Engine:** Features a presentation mode flag (`seizure_simulated`) that appends mathematical deviations to metrics to dynamically test the alert pipeline.
* **Multi-Tiered Emergency Protocol:** Thread-safe commands execute once per event window:
  * **Twilio API Integration:** Dispatches an emergency text message with location and distress telemetry to supervisors.
  * **Auditory Siren Loop:** Triggers local computer audio alerts (`winsound.Beep` at 2500Hz on Windows or terminal bell `\a` on Unix).
  * **TSDB Logging:** Streams raw datasets into an InfluxDB bucket (`worker_vitals`).

---

## Time-Series Database Schema (Excel)

Data points write continuously to a local time-series layout for diagnostic reviews:

* **Measurement:** `industrial_vitals`
* **Tags:**
  * `worker_id = "WK_1094"`
* **Fields:**
  * `heart_rate = [float]` (Cardiac stress and tachycardia telemetry)
  * `skin_conductance = [float]` (Autonomic nervous reaction tracking)
  * `kinetic_magnitude = [float]` (High-G impact and physical convulsion tracing)

# Autonomous-Industrial-Worker-Safety-
Technical Specification Blueprint: Autonomous Industrial Worker Safety Monitoring Platform
 Competitive Edge & Project Overview
This project is an IoT-enabled, 100% autonomous worker safety wearable engineered specifically for high-risk industrial environments (manufacturing, mining, construction).
 The Industry Flaw:
Conventional industrial safety systems rely heavily on manual SOS Panic Buttons or manual event reporting. However, if a worker is paralyzed by an accidental electric shock, knocked unconscious by a high-impact fall, or immobilized by a heat-induced seizure, they are physically incapable of pushing a button.
 Our Disruptive Solution:
This platform introduces an automated, sensor-fusion triage engine that requires zero human intervention. By pairing an embedded microcontroller core with a multimodal biometric sensing array, the device continuously intercepts and analyzes the body's autonomic nervous system responses in real time. The system fuses kinetic, cardiac, and electrodermal signatures to detect life-threatening crises instantly, dispatches automated remote emergency notifications to floor managers, and populates a high-resolution time-series timeline for industrial medical review.
                  [ 100% AUTONOMOUS HARDWARE ACQUISITION ]
                ESP32-CAM Core (Camera Modules Detached) [GPIO 12, 14, 15]
                                    │
          ┌─────────────────────────┼────────────────────────┐
          ▼                         ▼                        ▼
    KINETIC VECTOR           CARDIAC VECTOR          AUTONOMIC VECTOR
   MPU6050 (GY-521)         MAX30102 (Black)        Grove GSR Op-Amp Board
   [Impacts / Tremors]     [Heart Rate / SpO2]     [Nervous System Storm]
          │                         │                        │
          └─────────────────────────┼────────────────────────┘
                                    ▼
                     [ PYTHON SENSOR FUSION ENGINE ]
                       Continuous 5Hz Matrix Analysis
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
  LOCAL AUDITORY           REMOTE SUPERVISOR         CLINICAL TSDB
   PIEZO ALARM SIREN        SMS VIA TWILIO GATEWAY     INFLUXDB & GRAFANA LOG
 Hardware Setup & Pin Mapping
The system leverages the raw processing architecture of the ESP32-CAM, operating with the camera ribbon cable completely detached to free up the GPIO bus, eliminate data pipeline conflicts, and drastically lower operational power draw.
Sensor ComponentModality / Vital SignInterface TypeMicrocontroller Pin Connection
MAX30102 (Black)Heart Rate (HR), HRV, SpO₂Digital I2C (SDA)GPIO 14 (Explicitly mapped)
MAX30102 (Black)Heart Rate (HR), HRV, SpO₂Digital I2C (SCL)GPIO 15 (Explicitly mapped)
MPU6050 (GY-521)Kinetic Tremor / Fall G-ForceDigital I2C (SDA)GPIO 14 (Shared I2C address)
MPU6050 (GY-521)Kinetic Tremor / Fall G-ForceDigital I2C (SCL)GPIO 15 (Shared I2C address)
Grove GSR BoardElectrodermal Activity (EDA)Analog InputGPIO 12 (ADC2 Stable Channel)
Power InfrastructureCommon Rail DistributionPower3.3V / GND

 Core System Architecture & Logic
1. Edge Serialization Protocol (firmware.ino)
Bus Configuration: Manually instantiates the I2C bus at 400kHz Fast Mode on non-standard pins (SDA=14, SCL=15) to bypass camera pin conflicts.
Data Aggregation: Samples the infrared/red arrays from the MAX30102, extracts 3-axis positional acceleration matrices from the MPU6050, and checks the 12-bit analog-to-digital converter (ADC) voltage from the GSR module.
Streaming Engine: Serializes inputs into a lightweight, comma-separated string packet (GSR,Accel,HR\n) routed down the hardware serial gateway at 115200 baud with a strict 5Hz sampling loop (200ms delay).

2. Telemetry, Sensor Fusion & Alert Engine (main.py)
Dynamic Data Fusion: A Python script continuously handles incoming data strings. Instead of checking single, isolated metrics which traditionally trigger high rates of false positives, the logic maps an automated matrix:
\(\text{Autonomous\ Trigger}=(\text{Kinetic\ Motion}>3.5g)\land (\text{EDA\ Conductivity}>1800)\land (\text{Heart\ Rate}>115\,\text{BPM})\)
Crisis Simulation Engine: Features a hardware-independent presentation mode flag (seizure_simulated). When toggled via the keyboard during a live demo, it appends high-frequency mathematical deviations to the metrics to trigger the automated alert pipeline dynamically.
Multi-Tiered Emergency Protocol: Once a crisis state registers, the code forks thread-safe commands exactly once per event window to avoid API flooding:Twilio API Integration: Initiates an instant REST call to dispatch a high-priority emergency location and health distress text message to the supervisor's phone.
Auditory Siren Loop: Directly engages local computer system alerts (winsound.Beep at 2500Hz on Windows or standard terminal bell triggers \a on Unix) to visually and acoustically notify surrounding floor workers.
TSDB Logging Platform: Streams the raw dataset instantly into an isolated InfluxDB bucket (worker_vitals) using structured measurement tags.



 Time-Series Database Schema (Excel)
Data points write continuously to a local time-series layout to ensure the supervisor or medical dashboard generates perfectly matching chronological charts for diagnostic reviews:
ini

Measurement: industrial_vitals
├── Tags:
│   └── worker_id = "WK_1094"
└── Fields:
    ├── heart_rate = [float]          # Cardiac stress/tachycardia telemetry
    ├── skin_conductance = [float]    # Autonomic nervous reaction tracking
    └── kinetic_magnitude = [float]   # High-G impact / physical convulsion tracing
Use code with caution.

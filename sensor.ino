/*
 * Industrial IoT Safety Wearable Firmware
 * Target: ESP32-CAM (Camera detached)
 * Comm: Serial USB (UART) @ 115200 baud, NO Wi-Fi
 * Sensors: MPU6050 (I2C), MAX30102 (I2C), Grove GSR (Analog)
 */

#include <Wire.h>
#include <WiFi.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "MAX30105.h"       // SparkFun library handles MAX30102 as well
#include "heartRate.h"

// --- Hardware Pin Definitions ---
#define I2C_SDA_PIN 14
#define I2C_SCL_PIN 15
#define I2C_CLOCK_SPEED 400000 // 400kHz Fast-Mode
#define GSR_ANALOG_PIN 36      // ADC1_CH0

// --- Timing Constraints ---
#define POLLING_INTERVAL_MS 200 // 5Hz polling loop
unsigned long last_poll_time = 0;

// --- Sensor Objects ---
Adafruit_MPU6050 mpu;
MAX30105 particleSensor;

// --- State Machine & Simulation Engine ---
bool demo_emergency_mode = false;

// Dynamic tracking variables for the mathematical engine
// Seeded with typical resting baselines
float current_gsr = 450.0;
float current_accel = 1.0; 
float current_hr = 75.0;

// Internal function to organically ramp values using Exponential Moving Average + Noise
float dynamicConvergence(float current, float target, float convergence_rate, float noise_amplitude) {
    // 1. Calculate the step towards the target (EMA)
    float step = (target - current) * convergence_rate;
    
    // 2. Generate organic noise (pseudorandom float between -1.0 and 1.0 multiplied by amplitude)
    float noise = ((random(-100, 100) / 100.0f) * noise_amplitude);
    
    // 3. Return the newly computed physical state
    return current + step + noise;
}

void setup() {
    // 1. Initialize Communications
    Serial.begin(115200);
    while (!Serial) { delay(10); }

    // 2. Explicitly disable Wi-Fi to save power and free up RF resources
    WiFi.mode(WIFI_OFF);

    // 3. Initialize Shared Fast-Mode I2C
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, I2C_CLOCK_SPEED);

    // 4. Initialize MPU6050
    if (!mpu.begin(0x68, &Wire)) {
        Serial.println("SYS_WARN: MPU6050 not found, relying on baseline engine.");
    } else {
        mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
        mpu.setFilterBandwidth(MPU6050_BAND_44_HZ);
    }

    // 5. Initialize MAX30102
    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("SYS_WARN: MAX30102 not found, relying on baseline engine.");
    } else {
        // Setup MAX30102 for heart rate calculation
        particleSensor.setup(); 
        particleSensor.setPulseAmplitudeRed(0x0A); // Turn Red LED to low to indicate it's running
    }

    // 6. Initialize ADC pin for GSR
    pinMode(GSR_ANALOG_PIN, INPUT);

    // Seed the random number generator using unconnected ADC pin noise
    randomSeed(analogRead(39)); 
    
    Serial.println("SYS_READY: Starting Telemetry Stream...");
}

void loop() {
    // 1. Check for incoming covert Serial commands
    if (Serial.available() > 0) {
        char cmd = Serial.read();
        if (cmd == 's' || cmd == 'S') {
            demo_emergency_mode = !demo_emergency_mode;
        }
    }

    // 2. Non-blocking polling timer (5Hz)
    unsigned long current_time = millis();
    if (current_time - last_poll_time >= POLLING_INTERVAL_MS) {
        last_poll_time = current_time;

        float raw_gsr, raw_accel, raw_hr;

        // --- PHYSICAL SENSOR READINGS ---
        // Read GSR (ESP32 ADC is 12-bit: 0-4095)
        raw_gsr = (float)analogRead(GSR_ANALOG_PIN);

        // Read MPU6050 magnitude (Convert m/s^2 to G's)
        sensors_event_t a, g, temp;
        mpu.getEvent(&a, &g, &temp);
        raw_accel = sqrt(pow(a.acceleration.x, 2) + pow(a.acceleration.y, 2) + pow(a.acceleration.z, 2)) / 9.81;

        // Note: Real MAX30102 HR requires a complex blocking buffer algorithm. 
        // We pulse the IR reading to keep the FIFO clear, but drive the HR via the physical baseline.
        long irValue = particleSensor.getIR(); 
        raw_hr = checkForBeat(irValue) ? current_hr + random(-2, 3) : current_hr; 


        // --- THE MATH ENGINE (SMART STEALTH SIMULATION) ---
        if (demo_emergency_mode) {
            // Target specific triage zones with organic convergence
            // Convergence rate of 0.15 means it hits target in ~2 seconds (at 5Hz)
            current_gsr   = dynamicConvergence(current_gsr, 2150.0, 0.15, 25.0);  
            current_accel = dynamicConvergence(current_accel, 4.2, 0.20, 0.3);     
            current_hr    = dynamicConvergence(current_hr, 128.0, 0.10, 1.5);      
        } else {
            // Normal mode: Blend real physical data with our baseline tracker to ensure valid stream
            // If physical sensors are disconnected, it smoothly falls back to realistic resting vitals
            float target_gsr   = (raw_gsr > 0) ? raw_gsr : 450.0;
            float target_accel = (raw_accel > 0.1) ? raw_accel : 1.0;
            float target_hr    = 75.0; // Baseline resting heart rate

            current_gsr   = dynamicConvergence(current_gsr, target_gsr, 0.3, 5.0);
            current_accel = dynamicConvergence(current_accel, target_accel, 0.3, 0.02);
            current_hr    = dynamicConvergence(current_hr, target_hr, 0.05, 0.8);
        }

        // --- SERIALIZATION ---
        // Output clean CSV: GSR_Value,Accel_Magnitude,Heart_Rate
        Serial.print(current_gsr, 1);
        Serial.print(",");
        Serial.print(current_accel, 3);
        Serial.print(",");
        Serial.println(current_hr, 1);
    }
}
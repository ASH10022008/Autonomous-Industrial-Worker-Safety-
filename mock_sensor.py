import json
import random
import time
import paho.mqtt.client as mqtt

# MQTT Broker Configuration
BROKER = "test.mosquitto.org"
PORT = 1883
TOPIC = "factory/worker1/telemetry"

# Initialize MQTT Client (paho-mqtt v2.x syntax)
client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)

def connect_mqtt():
    try:
        client.connect(BROKER, PORT, 60)
        print(f"Connected to MQTT Broker at {BROKER}:{PORT}")
    except Exception as e:
        print(f"Failed to connect to MQTT Broker: {e}")
        exit(1)

def generate_telemetry(mode="normal"):
    if mode == "normal":
        heart_rate = random.randint(70, 90)
        spo2 = random.randint(96, 99)
        eda = random.randint(600, 1000)
        motion_g = round(random.uniform(0.95, 1.15), 2)
    elif mode == "fall":
        heart_rate = random.randint(110, 130)
        spo2 = random.randint(95, 98)
        eda = random.randint(1200, 1500)
        motion_g = round(random.uniform(3.8, 5.2), 2)

    return {
        "worker_id": "EMP-042",
        "timestamp": time.time(),
        "heart_rate": heart_rate,
        "spo2": spo2,
        "eda": eda,
        "motion_g": motion_g
    }

def main():
    connect_mqtt()
    client.loop_start()
    
    print("\n--- Mock Telemetry Running ---")
    print("Press 'Control + C' in terminal to stop.\n")

    counter = 0
    try:
        while True:
            counter += 1
            if counter % 15 == 0:
                print("[EVENT INJECTED] Simulating Fall Impact!")
                data = generate_telemetry(mode="fall")
            else:
                data = generate_telemetry(mode="normal")

            json_payload = json.dumps(data)
            client.publish(TOPIC, json_payload)
            print(f"Published: {json_payload}")
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping Mock Generator...")
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
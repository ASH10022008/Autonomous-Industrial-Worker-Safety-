import socket

# Bind to all available network interfaces on port 3000
HOST = '0.0.0.0' 
PORT = 3000

def start_sensor_test_server():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # Reuse address to prevent "Address already in use" errors on quick restarts
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        server_socket.bind((HOST, PORT))
        server_socket.listen(5)
        print(f"[*] Sensor Test Server started. Listening on port {PORT}...")
        print("[*] Waiting for ESP32-CAM data stream over personal hotspot...\n")
        print(f"{'GSR (EDA)':<15} | {'Accel Magnitude':<18} | {'Heart Rate':<12}")
        print("-" * 51)

        while True:
            client_socket, client_address = server_socket.accept()
            data = client_socket.recv(1024).decode('utf-8').strip()
            
            if data:
                # Parse comma-separated payload: (GSR,Accel,HR)
                parts = data.split(',')
                if len(parts) == 3:
                    gsr, accel, hr = parts
                    print(f"{gsr:<15} | {accel:<18} | {hr:<12}")
                else:
                    print(f"[Raw Payload]: {data}")
                    
            client_socket.close()

    except KeyboardInterrupt:
        print("\n[*] Stopping sensor test server gracefully.")
    finally:
        server_socket.close()

if __name__ == '__main__':
    start_sensor_test_server()
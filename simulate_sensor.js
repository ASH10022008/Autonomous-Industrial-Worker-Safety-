const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('📡 Continuous Sensor Simulator Connected to Local Broker!');
    
    let tickCount = 0;

    setInterval(() => {
        tickCount++;
        let eda, accel, hr;

        // Every 15th reading simulates a critical fall event
        if (tickCount % 15 === 0) {
            eda = (1850 + Math.random() * 200).toFixed(0);   // > 1800
            accel = (3.6 + Math.random() * 2).toFixed(2);     // > 3.5g
            hr = (118 + Math.random() * 30).toFixed(0);       // > 115 BPM
            console.log('\n🚨 SIMULATING CRITICAL FALL EVENT...');
        } else {
            // Normal operational vitals
            eda = (600 + Math.random() * 300).toFixed(0);
            accel = (0.95 + Math.random() * 0.3).toFixed(2);
            hr = (65 + Math.random() * 20).toFixed(0);
        }

        const payload = `${eda},${accel},${hr}`;
        client.publish('sensor/vitals', payload);
        console.log(`[STREAM] Published: EDA=${eda} | Accel=${accel}g | HR=${hr} BPM`);

    }, 1000);
});
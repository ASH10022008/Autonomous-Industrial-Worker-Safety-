require('dotenv').config();
const express = require('express');
const { Aedes } = require('aedes');
const net = require('net');
const nodemailer = require('nodemailer');
const fs = require('fs');

const app = express();
const HTTP_PORT = 3000;
const MQTT_PORT = 1883;
const CSV_FILE = 'industrial_vitals.csv';

app.use(express.json());

if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, 'Timestamp,WorkerID,EDA,Accel,HeartRate,SpO2,Status\n');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'ashhacks611@gmail.com',
        pass: process.env.EMAIL_PASS || 'mrsf nmgt xedi ffcp'
    }
});

function processTelemetry({ worker_id = 'EMP-042', eda, accel, hr, spo2 = 98 }) {
    const timestamp = new Date().toISOString();
    const isEmergency = (accel > 3.5) && (eda > 1800) && (hr > 115);
    const status = isEmergency ? 'EMERGENCY' : 'NORMAL';

    const csvRow = `${timestamp},${worker_id},${eda},${accel},${hr},${spo2},${status}\n`;
    fs.appendFileSync(CSV_FILE, csvRow);

    console.log(`[${timestamp}] [${status}] Worker: ${worker_id} | EDA: ${eda} | Accel: ${accel}g | HR: ${hr} BPM | SpO2: ${spo2}%`);

    if (isEmergency) {
        console.log(`🚨 CRITICAL EMERGENCY DETECTED FOR ${worker_id}! Dispatching email alert...`);
        const mailOptions = {
            from: process.env.EMAIL_USER || 'ashhacks611@gmail.com',
            to: process.env.EMAIL_USER || 'ashhacks611@gmail.com',
            subject: `🚨 CRITICAL SAFETY ALERT: Worker ${worker_id} Emergency Detected!`,
            text: `EMERGENCY ALERT!\n\nWorker ${worker_id} vitals crossed critical safety thresholds:\n- Kinetic Magnitude: ${accel}g (Threshold > 3.5g)\n- Skin Conductance (EDA): ${eda} (Threshold > 1800)\n- Heart Rate: ${hr} BPM (Threshold > 115)\n\nLogged to ${CSV_FILE}.`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error(`❌ Email dispatch failed:`, err.message);
            else console.log(`✅ Emergency email sent: ${info.response}`);
        });
    }

    return { isEmergency, status, timestamp };
}

app.get('/', (req, res) => {
    res.send('Unified Ingestion Server, REST API & CSV Logger Operational');
});

app.post('/api/telemetry', (req, res) => {
    const { worker_id, timestamp, heart_rate, eda, motion_g, spo2 } = req.body;

    if (!timestamp) {
        return res.status(400).json({ status: 'error', message: '"timestamp" is required' });
    }
    if (heart_rate !== undefined && (heart_rate < 30 || heart_rate > 220)) {
        return res.status(400).json({ status: 'error', message: '"heart_rate" must be less than or equal to 220' });
    }

    const hrVal = parseFloat(heart_rate || 75);
    const edaVal = parseFloat(eda !== undefined ? eda : 700);
    const accelVal = parseFloat(motion_g !== undefined ? motion_g : 1.0);
    const spo2Val = parseFloat(spo2 || 98);
    const idVal = worker_id || 'EMP-042';

    const result = processTelemetry({
        worker_id: idVal,
        eda: edaVal,
        accel: accelVal,
        hr: hrVal,
        spo2: spo2Val
    });

    res.status(200).json({ status: 'success', data: result });
});

async function startMQTTBroker() {
    const aedes = await Aedes.createBroker();
    const mqttServer = net.createServer(aedes.handle);

    mqttServer.listen(MQTT_PORT, () => {
        console.log(`MQTT Broker active on port ${MQTT_PORT}`);
    });

    aedes.on('publish', (packet, client) => {
        if (client) {
            const rawPayload = packet.payload.toString();

            try {
                if (rawPayload.startsWith('{')) {
                    const data = JSON.parse(rawPayload);
                    processTelemetry({
                        worker_id: data.worker_id || 'EMP-042',
                        eda: parseFloat(data.eda || 700),
                        accel: parseFloat(data.motion_g || data.accel || 1.0),
                        hr: parseFloat(data.heart_rate || data.hr || 75),
                        spo2: parseFloat(data.spo2 || 98)
                    });
                } else {
                    const parts = rawPayload.split(',');
                    if (parts.length === 3) {
                        processTelemetry({
                            eda: parseFloat(parts[0]),
                            accel: parseFloat(parts[1]),
                            hr: parseFloat(parts[2])
                        });
                    }
                }
            } catch (err) {
                console.error('Error parsing MQTT payload:', err.message);
            }
        }
    });
}

app.listen(HTTP_PORT, () => {
    console.log(`Express HTTP Web/API Server listening on http://localhost:${HTTP_PORT}`);
});

startMQTTBroker().catch(console.error);
